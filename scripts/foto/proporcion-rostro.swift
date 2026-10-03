// Proporción del rostro con Vision (macOS), en unidades de distancia interpupilar (IPD), para comparar caras de la misma
// persona sin que importe la escala: ancho del contorno (de oreja a oreja por la mandíbula) / IPD y ojos→mentón / IPD.
// Una cara «afinada» por el modelo baja el ancho/IPD y sube el largo/IPD. Válido para rostros casi frontales: con giro,
// el ancho aparente baja por perspectiva (se informa también el desvío horizontal de la nariz como pista de giro).
// Lo invoca `pnpm foto:rostro` (scripts/foto/rostro.mjs); a mano: swift scripts/foto/proporcion-rostro.swift <imagen>...
import Foundation
import Vision
import AppKit

for path in CommandLine.arguments.dropFirst() {
  guard let img = NSImage(contentsOfFile: path), let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { print("{\"archivo\":\"\(path)\",\"error\":\"no se pudo leer\"}"); continue }
  let W = Double(cg.width), H = Double(cg.height)
  let req = VNDetectFaceLandmarksRequest()
  try? VNImageRequestHandler(cgImage: cg).perform([req])
  guard let face = req.results?.first, let lm = face.landmarks,
        let cont = lm.faceContour?.pointsInImage(imageSize: CGSize(width: W, height: H)),
        let le = lm.leftEye?.pointsInImage(imageSize: CGSize(width: W, height: H)),
        let re = lm.rightEye?.pointsInImage(imageSize: CGSize(width: W, height: H)),
        let lips = lm.innerLips?.pointsInImage(imageSize: CGSize(width: W, height: H)),
        let nose = lm.noseCrest?.pointsInImage(imageSize: CGSize(width: W, height: H)) else { print("{\"archivo\":\"\(path)\",\"error\":\"sin rostro\"}"); continue }
  // El centro del CONTORNO de cada ojo, no la pupila: la mirada (hacia abajo, hacia arriba, ojos cerrados) mueve la
  // pupila y corría la medida sin que la cara cambiara (medido el 2026-10-03 en concentración, hartazgo y alivio).
  let centro = { (p: [CGPoint]) -> CGPoint in CGPoint(x: p.map { $0.x }.reduce(0, +) / CGFloat(p.count), y: p.map { $0.y }.reduce(0, +) / CGFloat(p.count)) }
  let lp = centro(le), rp = centro(re)
  let ipd = hypot(Double(lp.x - rp.x), Double(lp.y - rp.y))
  // Boca abierta: alto del contorno interior de los labios en unidades de IPD. Abierta, la mandíbula baja y la cara se
  // alarga de verdad; se informa para no confundirlo con un rostro afinado.
  let boca = (Double(lips.map { $0.y }.max()!) - Double(lips.map { $0.y }.min()!)) / ipd
  // Apertura de los ojos (alto medio del contorno / IPD): con los ojos cerrados el contorno baja y la medida se corre.
  let alto = { (p: [CGPoint]) -> Double in Double(p.map { $0.y }.max()! - p.map { $0.y }.min()!) }
  let ojos = (alto(le) + alto(re)) / 2 / ipd
  let xs = cont.map { Double($0.x) }, ys = cont.map { Double($0.y) }
  let ancho = (xs.max()! - xs.min()!)
  let ojosY = Double(lp.y + rp.y) / 2
  let menton = ys.min()!  // Vision: origen abajo
  let largo = ojosY - menton
  let medioOjos = Double(lp.x + rp.x) / 2
  let narizX = nose.map { Double($0.x) }.reduce(0, +) / Double(nose.count)
  let giro = (narizX - medioOjos) / ipd
  let nombre = (path as NSString).lastPathComponent
  print(String(format: "{\"archivo\":\"%@\",\"anchoIPD\":%.3f,\"largoIPD\":%.3f,\"largoAncho\":%.3f,\"giro\":%.3f,\"boca\":%.3f,\"ojos\":%.3f}", nombre, ancho / ipd, largo / ipd, largo / ancho, giro, boca, ojos))
}
