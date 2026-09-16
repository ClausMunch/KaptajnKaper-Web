$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$outputDirectory = Join-Path $PSScriptRoot '..\assets\sprites'
[void][System.IO.Directory]::CreateDirectory($outputDirectory)
$sheet = [System.Drawing.Bitmap]::new(128, 128, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($sheet)
$graphics.Clear([System.Drawing.Color]::Transparent)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
$palette = @{
    ink = '#182638'; steel = '#35475C'; gray = '#61788B'; silver = '#A3BBC7'
    white = '#FFF4D4'; waterDark = '#174963'; water = '#247C9C'; cyan = '#46BCCC'
    foam = '#A0E7DF'; ice = '#E6FFF1'; red = '#963C36'; ember = '#CF5031'
    orange = '#F28136'; gold = '#FFC254'; yellow = '#FFE69A'
    woodDark = '#573B38'; wood = '#A76A43'; woodLight = '#E5AB68'
    smokeDark = '#444451'; smoke = '#747080'; smokeLight = '#A49BA5'
}
$brushes = @{}
foreach ($name in $palette.Keys) {
    $brushes[$name] = [System.Drawing.SolidBrush]::new(
        [System.Drawing.ColorTranslator]::FromHtml($palette[$name]))
}
$frames = [ordered]@{}
$script:ox = 0
$script:oy = 0

function Frame($name, $column, $row, $originY = 0.5) {
    $script:ox = $column * 32
    $script:oy = $row * 32
    $frames[$name] = [ordered]@{
        frame = [ordered]@{ x = $script:ox; y = $script:oy; w = 32; h = 32 }
        rotated = $false
        trimmed = $false
        spriteSourceSize = [ordered]@{ x = 0; y = 0; w = 32; h = 32 }
        sourceSize = [ordered]@{ w = 32; h = 32 }
        pivot = [ordered]@{ x = 0.5; y = $originY }
    }
}

function Rect($color, [int]$x, [int]$y, [int]$w = 1, [int]$h = 1) {
    $graphics.FillRectangle($brushes[$color], ($script:ox + $x), ($script:oy + $y), $w, $h)
}

function Poly($color, [string]$coordinates) {
    [System.Drawing.Point[]]$points = @(
        foreach ($pair in $coordinates.Split(' ', [System.StringSplitOptions]::RemoveEmptyEntries)) {
            $xy = $pair.Split(',')
            [System.Drawing.Point]::new(($script:ox + [int]$xy[0]), ($script:oy + [int]$xy[1]))
        }
    )
    $graphics.FillPolygon($brushes[$color], $points)
}

function Ripple([int]$width, $color = 'waterDark') {
    $left = 16 - $width
    $right = 15 + $width
    Rect $color ($left + 3) 24 ($width * 2 - 6) 1
    Rect $color $left 25 3 2
    Rect $color ($right - 2) 25 3 2
    Rect $color ($left + 3) 27 ($width * 2 - 6) 1
    Rect 'cyan' ($left + 3) 26 4 1
    Rect 'foam' ($right - 6) 27 3 1
}

function Splinter([int]$x, [int]$y, [int]$dx, [int]$dy) {
    Poly 'woodDark' "$x,$y $($x+2),$y $($x+$dx+2),$($y+$dy) $($x+$dx),$($y+$dy+1)"
    Poly 'woodLight' "$x,$y $($x+1),$y $($x+$dx+1),$($y+$dy) $($x+$dx),$($y+$dy)"
    Rect 'wood' $x $y
}

try {
    Frame 'cannonball' 0 0
    Poly 'ink' '13,10 18,10 21,13 21,18 18,21 13,21 10,18 10,13'
    Poly 'steel' '13,11 18,11 20,13 20,17 17,20 13,19 11,17 11,13'
    Poly 'gray' '13,11 17,11 18,13 16,16 12,16 11,14'
    Rect 'silver' 13 12 3 2
    Rect 'ice' 13 12
    Rect 'gray' 18 17 1 2

    Frame 'crosshair' 1 0
    # Dark backing keeps the pale reticle readable over both water and fire.
    Poly 'ink' '9,5 14,5 14,8 10,8 8,10 8,14 5,14 5,9'
    Poly 'ink' '18,5 23,5 27,9 27,14 24,14 24,10 22,8 18,8'
    Poly 'ink' '5,18 8,18 8,22 10,24 14,24 14,27 9,27 5,23'
    Poly 'ink' '24,18 27,18 27,23 23,27 18,27 18,24 22,24 24,22'
    Poly 'white' '9,6 13,6 13,7 9,7 7,9 7,13 6,13 6,9'
    Poly 'white' '19,6 23,6 26,9 26,13 25,13 25,9 23,7 19,7'
    Poly 'white' '6,19 7,19 7,23 9,25 13,25 13,26 9,26 6,23'
    Poly 'white' '25,19 26,19 26,23 23,26 19,26 19,25 23,25 25,23'
    Rect 'ink' 14 2 4 8
    Rect 'ink' 14 22 4 8
    Rect 'ink' 2 14 8 4
    Rect 'ink' 22 14 8 4
    Rect 'gold' 15 3 2 6
    Rect 'gold' 15 23 2 6
    Rect 'gold' 3 15 6 2
    Rect 'gold' 23 15 6 2
    Rect 'ink' 14 14 4 4
    Rect 'white' 15 15 2 2

    Frame 'splash_00' 0 1 0.8125
    Ripple 8
    Poly 'waterDark' '9,25 7,20 10,20 12,22 13,16 16,19 19,15 21,22 24,20 23,25'
    Poly 'water' '10,24 9,21 13,23 14,18 17,22 19,17 20,24'
    Poly 'cyan' '12,24 14,20 16,23 19,20 20,25'
    Rect 'ice' 13 17 1 3
    Rect 'foam' 18 17 1 3
    Rect 'ice' 10 24 11 1
    Rect 'foam' 8 16 2 2
    Rect 'cyan' 23 17 2 2

    Frame 'splash_01' 1 1 0.8125
    Ripple 12
    Poly 'waterDark' '7,25 7,21 4,16 4,12 7,13 12,20 12,11 10,7 12,5 15,8 17,18 19,12 19,6 22,5 24,8 22,17 27,12 29,13 28,18 24,22 24,26'
    Poly 'water' '8,24 6,17 5,14 8,16 14,23 13,12 12,7 14,9 17,22 20,16 21,7 23,8 21,20 27,14 27,17 23,23 22,26'
    Poly 'cyan' '9,23 8,18 15,24 14,12 16,18 18,24 21,18 22,21 25,18 22,25'
    Poly 'foam' '12,25 14,22 16,23 18,20 19,24 22,23 23,26'
    Rect 'ice' 11 6 2 2
    Rect 'ice' 20 6 2 2
    Rect 'ice' 5 13 2 2
    Rect 'ice' 26 13 2 2
    Rect 'ice' 11 25 10 1
    Rect 'foam' 6 7 2 3
    Rect 'cyan' 26 6 2 2
    Rect 'ice' 16 3 2 2

    Frame 'splash_02' 2 1 0.8125
    Ripple 14
    Poly 'waterDark' '6,25 3,20 3,17 6,18 10,23 11,15 13,13 15,21 18,22 20,14 23,13 22,22 27,18 29,19 26,25 22,27 10,27'
    Poly 'water' '6,23 4,18 9,23 12,25 12,16 13,16 15,24 19,24 21,16 22,15 21,24 27,20 25,24 21,26 10,26'
    Poly 'cyan' '8,24 12,25 13,20 16,25 19,25 21,21 21,25 25,23 22,27 10,26'
    Rect 'ice' 10 25 4 1
    Rect 'foam' 17 26 7 1
    Rect 'ice' 12 14 1 3
    Rect 'foam' 21 14 2 2
    Rect 'foam' 5 10 2 3
    Rect 'ice' 11 6 2 3
    Rect 'cyan' 17 10 2 3
    Rect 'ice' 23 7 2 3
    Rect 'foam' 28 12 2 3
    Rect 'cyan' 2 12 1 2

    Frame 'splash_03' 3 1 0.8125
    Rect 'water' 3 25 5 1
    Rect 'cyan' 6 23 5 1
    Rect 'waterDark' 2 26 4 1
    Rect 'water' 8 28 7 1
    Rect 'foam' 10 27 5 1
    Rect 'cyan' 18 28 6 1
    Rect 'water' 25 26 5 1
    Rect 'foam' 23 24 4 1
    Rect 'waterDark' 14 23 6 1
    Rect 'foam' 14 24 4 1
    Rect 'cyan' 6 20 2 2
    Rect 'ice' 12 21 1 2
    Rect 'foam' 23 20 2 2
    Rect 'water' 27 22 2 1

    Frame 'explosion_00' 0 2 0.625
    Poly 'red' '11,20 8,15 13,16 14,11 17,15 22,12 21,18 25,21 20,23 21,27 16,25 12,27 12,23 7,22'
    Poly 'orange' '12,20 10,17 14,18 15,13 17,18 21,15 19,20 23,21 18,23 19,25 16,23 13,25 14,22 10,22'
    Poly 'yellow' '14,19 15,16 17,19 20,18 18,21 20,22 16,23 13,22'
    Rect 'white' 15 19 3 3
    Splinter 7 15 -2 -2
    Splinter 23 23 3 2
    Rect 'gold' 23 9 1 2

    Frame 'explosion_01' 1 2 0.625
    Poly 'red' '6,18 3,13 9,13 8,8 13,10 16,3 19,9 25,6 24,13 29,15 26,20 29,24 23,25 21,29 16,27 10,29 9,25 4,25'
    Poly 'ember' '7,18 5,14 11,15 10,10 14,12 16,6 19,12 23,9 22,15 27,16 23,20 27,23 21,23 20,27 16,25 11,27 11,23 6,24'
    Poly 'orange' '9,18 12,17 13,12 16,14 17,9 19,16 23,13 22,18 25,21 20,24 13,25 8,22'
    Poly 'gold' '11,18 14,18 15,14 18,18 21,16 21,21 18,24 13,23 10,21'
    Poly 'white' '13,19 16,16 18,19 20,19 19,22 15,23 12,21'
    Splinter 5 10 -2 -3
    Splinter 25 10 3 -3
    Splinter 5 25 -2 3
    Rect 'yellow' 28 20 2 1

    Frame 'explosion_02' 2 2 0.625
    Poly 'smokeDark' '5,15 3,11 6,7 11,7 13,3 18,3 21,7 26,7 29,11 27,16 29,20 25,25 20,27 9,26 4,23'
    Poly 'smoke' '5,11 7,8 11,8 13,5 18,5 20,9 25,8 27,11 25,15 8,16'
    Poly 'red' '4,19 8,15 7,11 12,12 14,7 18,10 23,9 23,15 28,17 26,23 22,26 15,28 8,25'
    Poly 'ember' '6,19 10,15 9,12 14,14 15,9 19,13 22,11 21,17 26,18 24,23 19,26 12,26 7,23'
    Poly 'orange' '8,20 12,17 13,12 16,16 19,13 21,18 24,19 21,24 16,26 11,23'
    Poly 'gold' '11,19 14,18 15,15 17,18 20,17 21,21 18,24 14,24 11,22'
    Poly 'yellow' '14,19 17,18 19,20 17,23 14,22'
    Rect 'white' 15 20 2 2
    Splinter 3 16 -1 -4
    Splinter 26 5 2 -3
    Splinter 26 25 3 3
    Splinter 5 26 -2 3
    Rect 'gold' 10 3 1 2

    Frame 'explosion_03' 3 2 0.625
    Poly 'smokeDark' '4,17 2,12 5,8 9,8 11,3 17,2 21,6 26,5 29,9 28,14 30,18 27,23 22,23 20,27 14,28 10,25 5,25 3,22'
    Poly 'smoke' '4,12 6,9 11,10 12,5 17,4 20,9 25,7 27,10 25,15 28,18 25,21 20,21 18,25 14,26 11,23 6,23 5,20 8,17'
    Poly 'smokeLight' '6,10 10,10 11,12 8,13 5,13'
    Poly 'smokeLight' '13,5 17,5 19,8 15,7 12,9'
    Poly 'smokeLight' '23,8 25,8 26,11 23,10'
    Poly 'red' '8,17 11,13 14,16 17,12 21,15 24,17 22,23 18,26 12,24 8,22'
    Poly 'ember' '10,18 12,15 14,19 17,15 19,18 22,17 21,22 18,24 13,23'
    Poly 'orange' '12,19 15,20 17,17 20,20 18,23 14,22'
    Rect 'gold' 16 20 2 2
    Splinter 2 22 1 4
    Splinter 27 27 2 2
    Splinter 25 3 3 -1
    Rect 'orange' 7 5 1 2

    Frame 'explosion_04' 0 3 0.625
    Poly 'smokeDark' '5,6 10,6 12,2 17,2 20,6 25,5 28,8 28,12 25,15 27,18 25,22 20,23 18,26 12,25 10,22 6,22 3,18 4,14 2,11'
    Poly 'smoke' '5,8 10,8 13,4 17,4 19,9 24,7 26,9 25,13 22,15 25,18 23,20 19,20 17,24 13,23 12,19 7,20 5,17 7,13 4,11'
    Poly 'smokeLight' '6,8 10,8 11,10 8,11 5,11'
    Poly 'smokeLight' '13,4 17,4 18,7 14,6 12,8'
    Poly 'smokeLight' '22,8 24,8 25,10 22,10'
    Poly 'ember' '10,18 13,17 14,20 12,22 10,21'
    Rect 'orange' 11 18 2 2
    Poly 'red' '19,16 22,15 22,18 19,20 17,19'
    Rect 'orange' 20 16 1 2
    Splinter 4 26 -1 3
    Splinter 26 27 2 2
    Rect 'ember' 17 28

    Frame 'explosion_05' 1 3 0.625
    Poly 'smokeDark' '4,8 6,5 10,5 12,8 10,11 6,12 3,10'
    Poly 'smoke' '5,8 7,6 10,6 10,9 6,10'
    Poly 'smokeLight' '6,6 9,6 9,7 6,8'
    Poly 'smokeDark' '13,3 18,2 21,5 20,8 17,10 13,8 12,6'
    Poly 'smoke' '14,4 18,3 19,5 18,7 14,7'
    Rect 'smokeLight' 14 4 3 1
    Poly 'smokeDark' '24,8 28,7 29,10 27,13 23,12'
    Poly 'smoke' '25,9 27,8 28,10 25,11'
    Poly 'smoke' '7,16 10,14 12,16 11,19 8,19'
    Rect 'smokeLight' 8 15 2 1
    Poly 'smokeDark' '17,15 20,13 23,15 22,18 19,19 16,17'
    Poly 'smoke' '18,15 20,14 22,15 20,17 18,17'
    Rect 'ember' 13 24 1 2
    Rect 'wood' 25 28 2 1

    $sheet.Save((Join-Path $outputDirectory 'battle_effects.png'), [System.Drawing.Imaging.ImageFormat]::Png)
    $atlas = [ordered]@{
        frames = $frames
        meta = [ordered]@{
            app = 'KaptajnKaper original pixel-art generator'
            version = '1.0'
            image = 'battle_effects.png'
            format = 'RGBA8888'
            size = [ordered]@{ w = 128; h = 128 }
            scale = '1'
        }
    }
    $json = $atlas | ConvertTo-Json -Depth 8
    [System.IO.File]::WriteAllText(
        (Join-Path $outputDirectory 'battle_effects.json'), $json + "`n",
        [System.Text.UTF8Encoding]::new($false))
    Write-Output "Generated battle_effects.png and battle_effects.json ($($frames.Count) frames)."
}
finally {
    $graphics.Dispose()
    $sheet.Dispose()
    foreach ($brush in $brushes.Values) { $brush.Dispose() }
}
