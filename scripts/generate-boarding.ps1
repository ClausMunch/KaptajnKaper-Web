$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$outputDirectory = Join-Path $PSScriptRoot '..\assets\sprites'
[void][System.IO.Directory]::CreateDirectory($outputDirectory)
$bitmap = [System.Drawing.Bitmap]::new(256, 128, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$palette = @{
    ink = '#18202d'; darkWood = '#49302d'; wood = '#855039'
    warmWood = '#ad7144'; lightWood = '#d49b59'; gold = '#f0c777'
    interior = '#352e32'; rope = '#c2ae80'; ropeShade = '#857655'
    redDark = '#8e263b'; red = '#c63749'; redLight = '#ee5960'
    whiteShade = '#c8d0d8'; white = '#fff4df'
    black = '#242c3b'; blackLight = '#364255'
    waterDark = '#285267'; water = '#418799'; foam = '#8dc6c2'
}
$colors = @{}
foreach ($name in $palette.Keys) {
    $colors[$name] = [System.Drawing.ColorTranslator]::FromHtml($palette[$name])
}
$script:originX = 0
$script:originY = 0

function Pixel([int]$x, [int]$y, [string]$color) {
    $bitmap.SetPixel($script:originX + $x, $script:originY + $y, $colors[$color])
}

function Rect([int]$x, [int]$y, [int]$w, [int]$h, [string]$color) {
    for ($py = $y; $py -lt $y + $h; $py++) {
        for ($px = $x; $px -lt $x + $w; $px++) { Pixel $px $py $color }
    }
}

function Line([int]$x0, [int]$y0, [int]$x1, [int]$y1, [string]$color) {
    $dx = [Math]::Abs($x1 - $x0)
    $dy = -[Math]::Abs($y1 - $y0)
    $sx = if ($x0 -lt $x1) { 1 } else { -1 }
    $sy = if ($y0 -lt $y1) { 1 } else { -1 }
    $balance = $dx + $dy
    while ($true) {
        Pixel $x0 $y0 $color
        if ($x0 -eq $x1 -and $y0 -eq $y1) { break }
        $twice = 2 * $balance
        if ($twice -ge $dy) { $balance += $dy; $x0 += $sx }
        if ($twice -le $dx) { $balance += $dx; $y0 += $sy }
    }
}

function Draw-Dinghy([int]$phase) {
    $bob = @(0, 1, 1, 0)[$phase]
    $script:originY += $bob
    Line 10 27 49 27 'waterDark'
    Line 5 26 13 26 'water'
    Line 47 26 58 26 'water'
    Line (6 + $phase) 28 (14 + $phase) 28 'foam'
    Line (44 - $phase) 28 (51 - $phase) 28 'foam'

    # Far-side oars are behind the hull; near-side oars overlay the gunwale.
    $tips = @(@(12, 5), @(20, 3), @(31, 5), @(20, 8))
    $tipX = $tips[$phase][0]
    $tipY = $tips[$phase][1]
    foreach ($offset in @(0, 20)) {
        Line (24 + $offset) 16 ($tipX + $offset) $tipY 'ink'
        Line (24 + $offset) 15 ($tipX + $offset) ($tipY - 1) 'lightWood'
        Rect ($tipX + $offset - 2) ($tipY - 1) 4 2 'gold'
    }

    Line 5 13 13 10 'ink'
    Line 13 10 46 10 'ink'
    Line 46 10 59 14 'ink'
    Line 4 14 8 20 'ink'
    Rect 8 12 45 8 'darkWood'
    Rect 13 11 33 2 'lightWood'
    Rect 12 13 38 6 'interior'
    Line 7 13 13 11 'gold'
    Line 47 11 56 14 'gold'
    Rect 17 13 5 6 'wood'
    Rect 17 13 5 2 'lightWood'
    Rect 35 13 5 6 'wood'
    Rect 35 13 5 2 'lightWood'
    Rect 47 14 5 5 'warmWood'
    Line 48 14 52 15 'gold'

    Line 6 18 11 24 'ink'
    Rect 11 19 39 7 'ink'
    Line 49 25 58 18 'ink'
    Line 58 18 59 14 'ink'
    Rect 10 19 44 2 'warmWood'
    Rect 12 21 39 2 'wood'
    Rect 16 23 31 2 'darkWood'
    Line 7 17 14 19 'gold'
    Line 14 19 48 19 'lightWood'
    Line 48 19 58 15 'gold'
    Line 12 21 51 21 'darkWood'
    Line 18 24 44 24 'wood'
    foreach ($x in @(16, 28, 42, 51)) { Pixel $x 20 'ink' }
    Line 54 16 56 21 'ropeShade'
    Line 55 16 57 21 'rope'
    Rect 55 21 3 2 'ropeShade'

    $nearTips = @(@(14, 28), @(26, 29), @(34, 25), @(24, 23))
    $tipX = $nearTips[$phase][0]
    $tipY = $nearTips[$phase][1]
    foreach ($offset in @(0, 19)) {
        Line (23 + $offset) 18 ($tipX + $offset) $tipY 'ink'
        Line (24 + $offset) 18 ($tipX + $offset + 1) $tipY 'lightWood'
        Rect ($tipX + $offset - 1) ($tipY - 1) 4 2 'warmWood'
        Line ($tipX + $offset) ($tipY - 1) ($tipX + $offset + 2) ($tipY - 1) 'gold'
        Pixel (24 + $offset) 18 'rope'
    }
    $script:originY -= $bob
}

$skull = @(
    '....#######....',
    '...#########...',
    '..###########..',
    '..##..###..##..',
    '..##..###..##..',
    '..#####.#####..',
    '...###...###...',
    '....#######....',
    '....#.#.#.#....',
    '...............',
    '.##.........##.',
    '####.......####',
    '...###...###...',
    '.....#####.....',
    '...###...###...',
    '####.......####',
    '.##.........##.'
)

function Draw-Flag([int]$phase, [bool]$pirate) {
    Rect 8 4 3 40 'ink'
    Rect 9 5 1 38 'lightWood'
    Rect 8 3 3 3 'gold'
    Pixel 9 3 'white'
    Rect 7 43 5 2 'darkWood'
    Line 7 10 7 38 'ropeShade'

    # A column-wise integer wave moves the fabric and emblem together.
    $wave = @(0, 0, 1, 2, 2, 1, 0, -1, -2, -2, -1, 0)
    for ($u = 0; $u -lt 40; $u++) {
        $index = ([int][Math]::Floor($u / 4) + $phase * 3) % $wave.Count
        $shift = if ($u -lt 3) { 0 } else { $wave[$index] }
        $y = 8 + $shift
        Pixel (11 + $u) ($y - 1) 'ink'
        for ($v = 0; $v -lt 26; $v++) {
            $shade = ($u + $phase * 8) % 32
            if ($pirate) {
                $color = if ($shade -lt 7) { 'blackLight' } else { 'black' }
                $sx = $u - 13
                $sy = $v - 4
                if ($sx -ge 0 -and $sx -lt 15 -and $sy -ge 0 -and $sy -lt 17 -and $skull[$sy][$sx] -eq '#') {
                    $color = if ($shade -gt 25) { 'whiteShade' } else { 'white' }
                }
            } else {
                $color = if ($shade -lt 7) { 'redLight' } elseif ($shade -gt 25) { 'redDark' } else { 'red' }
                if (($u -ge 11 -and $u -le 14) -or ($v -ge 11 -and $v -le 14)) {
                    $color = if ($shade -gt 25) { 'whiteShade' } else { 'white' }
                }
            }
            Pixel (11 + $u) ($y + $v) $color
        }
        Pixel (11 + $u) ($y + 26) 'ink'
        if ($u -eq 39) { Line 51 ($y - 1) 51 ($y + 26) 'ink' }
    }
    Rect 8 9 3 1 'rope'
    Rect 8 31 3 1 'rope'
}

$frames = [ordered]@{}
function Add-Frame([string]$name, [int]$x, [int]$y, [int]$w, [int]$h, [double]$pivotX, [double]$pivotY) {
    $frames[$name] = [ordered]@{
        frame = @{ x = $x; y = $y; w = $w; h = $h }
        rotated = $false
        trimmed = $false
        spriteSourceSize = @{ x = 0; y = 0; w = $w; h = $h }
        sourceSize = @{ w = $w; h = $h }
        pivot = @{ x = $pivotX; y = $pivotY }
    }
}

try {
    for ($phase = 0; $phase -lt 4; $phase++) {
        $script:originX = $phase * 64
        $script:originY = 0
        Draw-Dinghy $phase
        Add-Frame "dinghy_row_$phase" $script:originX 0 64 32 0.5 0.8125
        $script:originY = 32
        Draw-Flag $phase $false
        Add-Frame "flag_dannebrog_$phase" $script:originX 32 64 48 0.1484375 0.9166666666666666
        $script:originY = 80
        Draw-Flag $phase $true
        Add-Frame "flag_jolly_roger_$phase" $script:originX 80 64 48 0.1484375 0.9166666666666666
    }
    $atlas = [ordered]@{
        frames = $frames
        meta = [ordered]@{
            app = 'Kaptajn Kaper boarding pixel-art generator'
            version = '1.0'
            image = 'boarding.png'
            format = 'RGBA8888'
            size = @{ w = 256; h = 128 }
            scale = '1'
        }
    }
    $bitmap.Save((Join-Path $outputDirectory 'boarding.png'), [System.Drawing.Imaging.ImageFormat]::Png)
    $json = $atlas | ConvertTo-Json -Depth 8
    [System.IO.File]::WriteAllText((Join-Path $outputDirectory 'boarding.json'), $json + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))
    Write-Output 'Generated boarding.png (256x128 RGBA) and boarding.json (12 frames).'
} finally {
    $bitmap.Dispose()
}
