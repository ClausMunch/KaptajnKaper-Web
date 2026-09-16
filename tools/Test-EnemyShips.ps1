param(
    [string]$AssetDirectory = (Join-Path $PSScriptRoot '..\assets\sprites')
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
function Assert($condition, [string]$message) {
    if (-not $condition) { throw $message }
}

$atlas = Get-Content -Raw (Join-Path $AssetDirectory 'ships_enemy.json') | ConvertFrom-Json
$png = Join-Path $AssetDirectory 'ships_enemy.png'
$bitmap = [System.Drawing.Bitmap]::new($png)
$sha = [System.Security.Cryptography.SHA256]::Create()
try {
    Assert ($bitmap.RawFormat.Guid -eq [System.Drawing.Imaging.ImageFormat]::Png.Guid) 'Not a PNG'
    Assert ($bitmap.Width -eq 512 -and $bitmap.Height -eq 512) 'Expected a 512x512 sheet'
    Assert ($atlas.meta.size.w -eq $bitmap.Width -and $atlas.meta.size.h -eq $bitmap.Height) 'Atlas dimensions differ'
    Assert ($atlas.meta.image -eq 'ships_enemy.png' -and $atlas.meta.format -eq 'RGBA8888') 'Invalid image metadata'
    $ids = @('handelsmand', 'troppetransport', 'kanonbaad', 'galease', 'brig', 'skonnert', 'orlogsmand', 'soeroverskib')
    $expected = @($ids | ForEach-Object { "${_}_topview"; "${_}_sideview" })
    $names = @($atlas.frames.PSObject.Properties.Name)
    Assert ($names.Count -eq 16 -and -not (Compare-Object $expected $names)) 'Incorrect frame names'
    $coverage = [int[,]]::new(512, 512)
    $hashes = [System.Collections.Generic.HashSet[string]]::new()
    foreach ($name in $expected) {
        $entry = $atlas.frames.$name
        $f = $entry.frame
        $width = if ($name.EndsWith('_topview')) { 64 } else { 176 }
        Assert ($f.w -eq $width -and $f.h -eq 112) "$name has incorrect dimensions"
        Assert ($f.x -ge 0 -and $f.y -ge 0 -and $f.x + $f.w -le 512 -and $f.y + $f.h -le 512) "$name out of bounds"
        Assert (-not $entry.rotated -and -not $entry.trimmed) "$name should be unrotated and untrimmed"
        Assert ($entry.sourceSize.w -eq $f.w -and $entry.sourceSize.h -eq $f.h) "$name source size mismatch"
        Assert ($entry.spriteSourceSize.x -eq 0 -and $entry.spriteSourceSize.y -eq 0 -and
            $entry.spriteSourceSize.w -eq $f.w -and $entry.spriteSourceSize.h -eq $f.h) "$name source rectangle mismatch"
        $pivotY = if ($name.EndsWith('_topview')) { 0.5 } else { 91.0 / 112 }
        Assert ($entry.pivot.x -eq 0.5 -and $entry.pivot.y -eq $pivotY) "$name pivot mismatch"
        $pixels = [System.Collections.Generic.List[byte]]::new()
        $opaque = 0
        for ($y = 0; $y -lt $f.h; $y++) {
            for ($x = 0; $x -lt $f.w; $x++) {
                $px = $f.x + $x; $py = $f.y + $y
                Assert ($coverage[$px, $py] -eq 0) "$name overlaps another frame"
                $coverage[$px, $py] = 1
                $color = $bitmap.GetPixel($px, $py)
                $pixels.AddRange([BitConverter]::GetBytes($color.ToArgb()))
                if ($color.A -ne 0) {
                    $opaque++
                    Assert ($x -ge 2 -and $y -ge 2 -and $x -lt $f.w - 2 -and $y -lt $f.h - 2) "$name lacks transparent gutters"
                }
            }
        }
        Assert ($opaque -gt 100) "$name is empty or nearly empty"
        Assert ($hashes.Add([Convert]::ToBase64String($sha.ComputeHash($pixels.ToArray())))) "$name duplicates another sprite"
    }
    $allowed = [System.Collections.Generic.HashSet[int]]::new()
    foreach ($hex in $atlas.meta.palette) {
        [void]$allowed.Add([System.Drawing.ColorTranslator]::FromHtml($hex).ToArgb())
    }
    Assert ($allowed.Count -eq 24) 'Expected 24 palette entries'
    $used = [System.Collections.Generic.HashSet[int]]::new()
    $transparent = 0
    for ($y = 0; $y -lt 512; $y++) {
        for ($x = 0; $x -lt 512; $x++) {
            $color = $bitmap.GetPixel($x, $y)
            if ($color.A -eq 0) { $transparent++; continue }
            Assert ($color.A -eq 255) 'Unexpected antialiasing / partial transparency'
            Assert ($allowed.Contains($color.ToArgb())) 'Color outside declared palette'
            Assert ($coverage[$x, $y] -eq 1) 'Artwork outside atlas frames'
            [void]$used.Add($color.ToArgb())
        }
    }
    Assert ($transparent -gt 0 -and $used.Count -ge 16 -and $used.Count -le 32) 'Invalid retro color count or transparency'
    Write-Output "PASS: 16 unique frames, bounds, gutters, pivots, PNG format, transparency, and palette ($($used.Count) colors used)."
} finally {
    $sha.Dispose()
    $bitmap.Dispose()
}
