// Mide el rostro con Vision (macOS): caja de la cara y contorno (mentón) en píxeles de la imagen, origen arriba-izquierda.
// swift medir-rostro.swift <imagen>...  → una línea JSON por imagen
import Foundation
import Vision
import AppKit

for path in CommandLine.arguments.dropFirst() {
  guard let img = NSImage(contentsOfFile: path), let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    print("{\"archivo\":\"\(path)\",\"error\":\"no se pudo leer\"}"); continue
  }
  let W = Double(cg.width), H = Double(cg.height)
  let req = VNDetectFaceLandmarksRequest()
  try? VNImageRequestHandler(cgImage: cg, options: [:]).perform([req])
  guard let face = (req.results ?? []).max(by: { $0.boundingBox.width < $1.boundingBox.width }) else {
    print("{\"archivo\":\"\(path)\",\"error\":\"sin rostro\"}"); continue
  }
  let bb = face.boundingBox
  // contorno de la cara: puntos normalizados dentro de la caja; el mentón es el punto más bajo
  var menton = bb.minY
  if let c = face.landmarks?.faceContour {
    for p in c.normalizedPoints { menton = min(menton, bb.minY + Double(p.y) * bb.height) }
  }
  var ojos = 0.0
  if let l = face.landmarks?.leftPupil?.normalizedPoints.first, let r = face.landmarks?.rightPupil?.normalizedPoints.first {
    ojos = (1 - (bb.minY + Double(l.y + r.y) / 2 * bb.height)) * H
  }
  let x0 = bb.minX * W, x1 = bb.maxX * W, top = (1 - bb.maxY) * H
  print("{\"archivo\":\"\(path)\",\"caraX0\":\(Int(x0)),\"caraX1\":\(Int(x1)),\"caraTop\":\(Int(top)),\"menton\":\(Int((1 - menton) * H)),\"ojos\":\(Int(ojos)),\"centroX\":\(Int((x0 + x1) / 2))}")
}
