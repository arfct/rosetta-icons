import AppKit
import Foundation

// Renders every calibration glyph to PNG, black on white, into png/<key>/<concept>.png.
// SVGs (24-unit viewBox) render at 10x → 240px. SF Symbols render at point size 100 per weight.
struct Entry: Decodable { let concept: String; let sf: String?; let files: [String: String] }
let manifest = try JSONDecoder().decode([Entry].self, from: Data(contentsOf: URL(fileURLWithPath: "manifest.json")))
let fm = FileManager.default
let sfWeights: [(String, NSFont.Weight)] = [("ultralight", .ultraLight), ("thin", .thin), ("light", .light), ("regular", .regular), ("medium", .medium), ("semibold", .semibold), ("bold", .bold), ("heavy", .heavy), ("black", .black)]

func save(_ image: NSImage, size: CGFloat, to path: String, drawSize: NSSize? = nil) {
  let canvas = NSImage(size: NSSize(width: size, height: size))
  canvas.lockFocus()
  NSColor.white.setFill(); NSRect(x: 0, y: 0, width: size, height: size).fill()
  let w = drawSize?.width ?? image.size.width, h = drawSize?.height ?? image.size.height
  image.draw(in: NSRect(x: (size - w) / 2, y: (size - h) / 2, width: w, height: h), from: .zero, operation: .sourceOver, fraction: 1)
  canvas.unlockFocus()
  let rep = NSBitmapImageRep(data: canvas.tiffRepresentation!)!
  try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: path))
}

var count = 0
for entry in manifest {
  for (key, file) in entry.files {
    guard var svg = try? String(contentsOfFile: file, encoding: .utf8) else { print("missing \(file)"); continue }
    // Lucide uses currentColor; AppKit's SVG loader needs a concrete color.
    svg = svg.replacingOccurrences(of: "currentColor", with: "#000000")
    guard let image = NSImage(data: svg.data(using: .utf8)!) else { print("unrenderable \(file)"); continue }
    let dir = "png/\(key)"; try? fm.createDirectory(atPath: dir, withIntermediateDirectories: true)
    let scale: CGFloat = 240 / max(image.size.width, image.size.height)
    save(image, size: 240, to: "\(dir)/\(entry.concept).png", drawSize: NSSize(width: image.size.width * scale, height: image.size.height * scale))
    count += 1
  }
  guard let name = entry.sf else { continue }
  for (label, weight) in sfWeights {
    let config = NSImage.SymbolConfiguration(pointSize: 100, weight: weight)
    guard let image = NSImage(systemSymbolName: name, accessibilityDescription: nil)?.withSymbolConfiguration(config) else { print("no sf \(name)"); continue }
    let dir = "png/sf@\(label)"; try? fm.createDirectory(atPath: dir, withIntermediateDirectories: true)
    let tinted = NSImage(size: image.size, flipped: false) { rect in
      NSColor.black.set()
      image.draw(in: rect, from: .zero, operation: .sourceOver, fraction: 1)
      return true
    }
    save(tinted, size: 300, to: "\(dir)/\(entry.concept).png")
    count += 1
  }
}
print("rendered \(count)")
