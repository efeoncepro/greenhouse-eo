// Proporción del rostro con Vision (macOS), en unidades de distancia interpupilar (IPD), para comparar caras de la misma
// persona sin que importe la escala: ancho del contorno (de oreja a oreja por la mandíbula) / IPD y ojos→mentón / IPD.
// Una cara «afinada» por el modelo baja el ancho/IPD y sube el largo/IPD. Válido para rostros casi frontales: con giro,
// el ancho aparente baja por perspectiva (se informa también el desvío horizontal de la nariz como pista de giro).
// swift proporcion-rostro.swift <imagen>...
import Foundation
import Vision
import AppKit

for path in CommandLine.arguments.dropFirst() {
  guard let img = NSImage(contentsOfFile: path), let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { print("{\"archivo\":\"\(path)\",\"error\":\"no se pudo leer\"}"); continue }
  let W = Double(cg.width), H = Double(cg.height)
  let req = VNDetectFaceLandmarksRequest()
  try? VNImageRequestHandler(cgImage: cg).perform([req])
  guard let face = (req.results as? [VNFaceObservation])?.first, let lm = face.landmarks,
        let cont = lm.faceContour?.pointsInImage(imageSize: CGSize(width: W, height: H)),
        let lp = lm.leftPupil?.pointsInImage(imageSize: CGSize(width: W, height: H)).first,
        let rp = lm.rightPupil?.pointsInImage(imageSize: CGSize(width: W, height: H)).first,
        let nose = lm.noseCrest?.pointsInImage(imageSize: CGSize(width: W, height: H)) else { print("{\"archivo\":\"\(path)\",\"error\":\"sin rostro\"}"); continue }
  let ipd = hypot(Double(lp.x - rp.x), Double(lp.y - rp.y))
  let xs = cont.map { Double($0.x) }, ys = cont.map { Double($0.y) }
  let ancho = (xs.max()! - xs.min()!)
  let ojosY = Double(lp.y + rp.y) / 2
  let menton = ys.min()!  // Vision: origen abajo
  let largo = ojosY - menton
  let medioOjos = Double(lp.x + rp.x) / 2
  let narizX = nose.map { Double($0.x) }.reduce(0, +) / Double(nose.count)
  let giro = (narizX - medioOjos) / ipd
  let nombre = (path as NSString).lastPathComponent
  print(String(format: "%@\tancho/IPD %.2f\tlargo/IPD %.2f\tlargo/ancho %.2f\tgiro %.2f", nombre, ancho / ipd, largo / ipd, largo / ancho, giro))
}
