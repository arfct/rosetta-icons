import AppKit
import Foundation

// Renders SF Symbols to PNG for local review sheets. Usage:
//   swift scripts/render-sf.swift <outDir> < names.txt
// Output goes to the gitignored renders/; review sheets render on the machine that views them.
let outDir = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "renders/sf"
try? FileManager.default.createDirectory(atPath: outDir, withIntermediateDirectories: true)
let config = NSImage.SymbolConfiguration(pointSize: 64, weight: .regular)
let canvasSize: CGFloat = 96
let glyphBox: CGFloat = 80
var rendered = 0
var missing: [String] = []

while let line = readLine() {
  let name = line.trimmingCharacters(in: .whitespaces)
  if name.isEmpty { continue }
  guard let base = NSImage(systemSymbolName: name, accessibilityDescription: nil),
        let image = base.withSymbolConfiguration(config) else {
    missing.append(name)
    continue
  }
  let canvas = NSImage(size: NSSize(width: canvasSize, height: canvasSize))
  canvas.lockFocus()
  NSColor.black.set()
  let scale = min(glyphBox / image.size.width, glyphBox / image.size.height)
  let width = image.size.width * scale, height = image.size.height * scale
  let rect = NSRect(x: (canvasSize - width) / 2, y: (canvasSize - height) / 2, width: width, height: height)
  image.draw(in: rect, from: .zero, operation: .sourceOver, fraction: 1)
  canvas.unlockFocus()
  guard let tiff = canvas.tiffRepresentation, let rep = NSBitmapImageRep(data: tiff),
        let png = rep.representation(using: .png, properties: [:]) else {
    missing.append(name)
    continue
  }
  try? png.write(to: URL(fileURLWithPath: "\(outDir)/\(name).png"))
  rendered += 1
}
print("rendered \(rendered) to \(outDir); missing \(missing.count)\(missing.isEmpty ? "" : ": " + missing.joined(separator: " "))")
if !missing.isEmpty { exit(1) }
