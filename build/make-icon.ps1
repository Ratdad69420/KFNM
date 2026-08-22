# Rebuild icon.ico from build/icon.png (does not draw the old WM badge).
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
if ((Split-Path -Leaf $PSScriptRoot) -ne "build") {
  $root = $PSScriptRoot
}
$outDir = Join-Path $root "build"
$pngPath = Join-Path $outDir "icon.png"
$icoPath = Join-Path $outDir "icon.ico"

if (-not (Test-Path $pngPath)) {
  throw "Missing $pngPath"
}

$src = [System.Drawing.Image]::FromFile($pngPath)
$sizes = @(16, 32, 48, 256)
$images = New-Object System.Collections.Generic.List[Object]
foreach ($s in $sizes) {
  $bmp = New-Object System.Drawing.Bitmap $s, $s
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear([System.Drawing.Color]::Transparent)
  $g.DrawImage($src, 0, 0, $s, $s)
  $g.Dispose()
  $ms = New-Object System.IO.MemoryStream
  $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
  $images.Add(@($s, $ms.ToArray())) | Out-Null
  $bmp.Dispose()
}
$src.Dispose()

$fs = [System.IO.File]::Create($icoPath)
$bw = New-Object System.IO.BinaryWriter $fs
$bw.Write([uint16]0)
$bw.Write([uint16]1)
$bw.Write([uint16]$images.Count)
$offset = 6 + (16 * $images.Count)
foreach ($img in $images) {
  $s = $img[0]
  $bytes = $img[1]
  $dim = 0
  if ($s -ne 256) { $dim = $s }
  $bw.Write([byte]$dim)
  $bw.Write([byte]$dim)
  $bw.Write([byte]0)
  $bw.Write([byte]0)
  $bw.Write([uint16]1)
  $bw.Write([uint16]32)
  $bw.Write([uint32]$bytes.Length)
  $bw.Write([uint32]$offset)
  $offset += $bytes.Length
}
foreach ($img in $images) {
  $bw.Write($img[1])
}
$bw.Flush()
$fs.Close()
Write-Output "Wrote $icoPath from $pngPath"
