param(
    [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\assets\sprites')
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

# Integer-only raster drawing keeps the shared 24-color palette free of antialiasing.
$palette = [ordered]@{
    ink = '#151525'; shadow = '#29283E'; slate = '#48465E'; steel = '#77788B'
    silver = '#ADBBC5'; white = '#FFF4DA'; sail = '#E4D5AF'; fold = '#B5A080'
    darkwood = '#392D35'; wood = '#674335'; plank = '#956044'; oak = '#BE8551'
    gold = '#F2C66D'; red = '#B63E55'; coral = '#EE6875'; maroon = '#682D49'
    cyan = '#65DAE0'; teal = '#308F9C'; navy = '#294966'; blue = '#4F82AD'
    magenta = '#CE63BA'; purple = '#794E91'; green = '#507C68'; lightgreen = '#92B782'
}
$brushes = @{}
$pens = @{}
foreach ($name in $palette.Keys) {
    $color = [System.Drawing.ColorTranslator]::FromHtml($palette[$name])
    $brushes[$name] = [System.Drawing.SolidBrush]::new($color)
    $pens[$name] = [System.Drawing.Pen]::new($color, 1)
}
$sheet = [System.Drawing.Bitmap]::new(512, 512)
$script:g = [System.Drawing.Graphics]::FromImage($sheet)
$g.Clear([System.Drawing.Color]::Transparent)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::None
$script:ox = 0
$script:oy = 0

function Rect([int]$x, [int]$y, [int]$w, [int]$h, [string]$c) {
    $g.FillRectangle($brushes[$c], $x + $script:ox, $y + $script:oy, $w, $h)
}
function Line([int]$x1, [int]$y1, [int]$x2, [int]$y2, [string]$c) {
    $g.DrawLine($pens[$c], $x1 + $script:ox, $y1 + $script:oy, $x2 + $script:ox, $y2 + $script:oy)
}
function Poly([int[]]$coords, [string]$c, [string]$edge = 'ink') {
    $points = [System.Drawing.Point[]]::new($coords.Length / 2)
    for ($p = 0; $p -lt $points.Length; $p++) {
        $points[$p] = [System.Drawing.Point]::new($coords[$p * 2] + $script:ox, $coords[$p * 2 + 1] + $script:oy)
    }
    $g.FillPolygon($brushes[$c], $points)
    $g.DrawPolygon($pens[$edge], $points)
}
function Skull([int]$x, [int]$y) {
    Line $x ($y + 9) ($x + 10) ($y + 14) 'white'
    Line $x ($y + 14) ($x + 10) ($y + 9) 'white'
    Rect ($x + 2) $y 7 6 'white'
    Rect ($x + 3) ($y + 6) 5 2 'white'
    Rect ($x + 3) ($y + 2) 2 2 'ink'
    Rect ($x + 6) ($y + 2) 2 2 'ink'
    Rect ($x + 5) ($y + 5) 1 2 'ink'
}
function Flag([int]$x, [int]$y, [string]$kind, [string]$accent) {
    if ($kind -eq 'pirate') {
        Rect ($x - 17) $y 16 18 'ink'
        Skull ($x - 15) ($y + 1)
    } else {
        Poly @(($x - 1),$y, ($x - 16),$y, ($x - 13),($y + 4), ($x - 16),($y + 8), ($x - 1),($y + 8)) $accent
        if ($kind -in @('navy', 'troop')) {
            Rect ($x - 11) ($y + 1) 2 7 'white'
            Rect ($x - 15) ($y + 3) 14 2 'white'
        } else {
            Line ($x - 12) ($y + 2) ($x - 4) ($y + 2) 'white'
        }
    }
}
function SquareSail([int]$x, [int]$y, [int]$w, [int]$h, [bool]$black = $false) {
    $half = [int]($w / 2)
    $fill = if ($black) { 'shadow' } else { 'sail' }
    $light = if ($black) { 'slate' } else { 'white' }
    $shade = if ($black) { 'ink' } else { 'fold' }
    Poly @(($x - $half),$y, ($x + $half),$y, ($x + $half + 3),($y + $h - 4),
        ($x + $half - 2),($y + $h),$x,($y + $h - 2),($x - $half - 2),($y + $h),
        ($x - $half + 2),($y + 5)) $fill
    Line ($x - $half + 2) ($y + 2) ($x + $half - 1) ($y + 2) $light
    Line ($x - $half + 5) ($y + 4) ($x - $half + 3) ($y + $h - 3) $light
    Line ($x + $half - 3) ($y + 4) ($x + $half) ($y + $h - 5) $shade
    Line ($x - 1) ($y + 3) ($x + 1) ($y + $h - 4) $shade
    Line ($x - $half - 3) ($y - 1) ($x + $half + 3) ($y - 1) 'darkwood'
}
function ForeAftSail([int]$x, [int]$y, [int]$w, [int]$h, [bool]$black = $false) {
    $fill = if ($black) { 'shadow' } else { 'sail' }
    $light = if ($black) { 'slate' } else { 'white' }
    Poly @($x, $y, ($x - $w), ($y + $h - 7), ($x - $w + 5), ($y + $h), ($x - 2), ($y + $h)) $fill
    Line ($x - 3) ($y + 8) ($x - $w + 5) ($y + $h - 7) $light
    Line ($x - 6) ($y + 15) ($x - 5) ($y + $h - 3) 'fold'
    Line ($x - $w - 2) ($y + $h + 1) $x ($y + $h + 1) 'darkwood'
}
function Crate([int]$x, [int]$y) {
    Rect $x $y 9 8 'ink'
    Rect ($x + 1) ($y + 1) 7 6 'oak'
    Line ($x + 1) ($y + 1) ($x + 7) ($y + 6) 'wood'
    Line ($x + 7) ($y + 1) ($x + 1) ($y + 6) 'wood'
}

$ships = @(
    @{ id = 'handelsmand'; label = 'Handelsmand'; kind = 'merchant'; accent = 'teal'; left = 39; right = 137; depth = 16; width = 22; length = 58; masts = @(86); heights = @(28); guns = 0 },
    @{ id = 'troppetransport'; label = 'Troppetransport'; kind = 'troop'; accent = 'red'; left = 23; right = 151; depth = 20; width = 30; length = 72; masts = @(63,108); heights = @(26,19); guns = 3 },
    @{ id = 'kanonbaad'; label = 'Kanonbåd'; kind = 'cannon'; accent = 'cyan'; left = 47; right = 129; depth = 12; width = 20; length = 46; masts = @(72); heights = @(46); guns = 0 },
    @{ id = 'galease'; label = 'Galease'; kind = 'galleas'; accent = 'green'; left = 23; right = 148; depth = 15; width = 24; length = 70; masts = @(56,110); heights = @(42,21); guns = 3 },
    @{ id = 'brig'; label = 'Brig'; kind = 'brig'; accent = 'blue'; left = 26; right = 146; depth = 18; width = 26; length = 66; masts = @(60,112); heights = @(20,15); guns = 5 },
    @{ id = 'skonnert'; label = 'Skonnert'; kind = 'schooner'; accent = 'magenta'; left = 31; right = 141; depth = 12; width = 18; length = 68; masts = @(73,120); heights = @(15,29); guns = 2 },
    @{ id = 'orlogsmand'; label = 'Orlogsmand'; kind = 'navy'; accent = 'red'; left = 13; right = 157; depth = 25; width = 34; length = 82; masts = @(43,85,125); heights = @(24,12,23); guns = 10 },
    @{ id = 'soeroverskib'; label = 'Sørøverskib'; kind = 'pirate'; accent = 'purple'; left = 26; right = 145; depth = 18; width = 26; length = 70; masts = @(65,113); heights = @(23,17); guns = 6 }
)

function SideView($s) {
    $l = $s.left; $r = $s.right; $deck = 91 - $s.depth
    $black = $s.kind -eq 'pirate'
    $hull = if ($black) { 'shadow' } else { 'wood' }
    # Standing rigging behind the canvas; the bow always points right.
    Line ($r - 6) $deck ($r + 13) ($deck - 13) 'ink'
    Line ($r - 5) ($deck - 1) ($r + 12) ($deck - 14) 'oak'
    foreach ($i in 0..($s.masts.Count - 1)) {
        $x = $s.masts[$i]; $y = $s.heights[$i]
        Line $l $deck $x ($y + 2) 'slate'
        Line $x ($y + 2) ($r + 12) ($deck - 14) 'slate'
        Rect ($x - 1) ($y - 9) 3 ($deck - $y + 10) 'darkwood'
        Line $x ($y - 8) $x $deck 'oak'
        Flag $x ($y - 8) $s.kind $s.accent
        switch ($s.kind) {
            'cannon' { ForeAftSail $x ($y + 2) 20 20 }
            'schooner' { ForeAftSail ($x - 2) ($y + 3) 37 ($deck - $y - 12) }
            'galleas' { ForeAftSail ($x - 2) ($y + 3) 33 ($deck - $y - 13) }
            'merchant' { SquareSail $x ($y + 4) 38 31 }
            default {
                $w = if ($s.kind -eq 'navy') { 29 } else { 34 }
                SquareSail $x ($y + 3) ($w - 6) 15 $black
                SquareSail $x ($y + 23) $w ([Math]::Max(15, $deck - $y - 29)) $black
                if ($black -and $i -eq 1) { Skull ($x - 5) ($y + 26) }
            }
        }
        Line ($x - 10) ($deck - 1) $x ($deck - 23) 'darkwood'
        Line ($x + 10) ($deck - 1) $x ($deck - 23) 'darkwood'
        for ($j = 0; $j -lt 4; $j++) {
            Line ($x - 7 + $j) ($deck - 4 - $j * 4) ($x + 7 - $j) ($deck - 4 - $j * 4) 'darkwood'
        }
    }
    if ($s.kind -ne 'cannon') {
        $x = $s.masts[-1]; $y = $s.heights[-1]
        Poly @(($x + 5),($y + 13), ($r + 9),($deck - 15), ($x + 7),($deck - 13)) $(if ($black) { 'slate' } else { 'sail' })
        Line ($x + 8) ($y + 23) ($r + 2) ($deck - 18) $(if ($black) { 'steel' } else { 'white' })
    }
    Poly @($l,($deck - 5), ($l + 20),($deck - 3), ($l + 26),$deck,
        ($r - 14),$deck, $r,($deck - 7), ($r - 5),($deck + 9),
        ($r - 20),91, ($l + 18),91, ($l + 5),83) $hull
    Poly @(($l + 8),($deck + 5), ($r - 6),($deck + 5), ($r - 13),($deck + 12),
        ($l + 14),($deck + 12)) $(if ($black) { 'slate' } else { 'plank' }) $hull
    Line ($l + 18) 89 ($r - 21) 89 'darkwood'
    Line ($l + 7) ($deck + 2) ($r - 4) ($deck + 2) $s.accent
    Line ($l + 9) ($deck + 3) ($r - 5) ($deck + 3) 'gold'
    for ($x = $l + 23; $x -lt $r - 15; $x += 15) {
        Line $x ($deck + 11) ($x + 9) ($deck + 11) 'oak'
    }
    if ($s.kind -ne 'cannon') {
        Rect ($l + 4) ($deck - 12) 20 10 'darkwood'
        Rect ($l + 6) ($deck - 10) 16 7 $s.accent
        for ($x = $l + 7; $x -lt $l + 22; $x += 5) {
            Rect $x ($deck - 8) 3 3 'gold'
        }
        Line ($l + 3) ($deck - 13) ($l + 25) ($deck - 13) 'oak'
    }
    for ($i = 0; $i -lt $s.guns; $i++) {
        $x = $l + 27 + [int]($i * ($r - $l - 47) / [Math]::Max(1, $s.guns - 1))
        Rect $x ($deck + 6) 6 5 'ink'
        Rect ($x + 1) ($deck + 7) 5 2 'steel'
        if ($s.kind -eq 'navy') {
            Rect ($x - 4) ($deck + 15) 6 5 'ink'
            Rect ($x - 3) ($deck + 16) 5 2 'steel'
        }
    }
    switch ($s.kind) {
        'merchant' {
            Crate 91 ($deck - 8); Crate 102 ($deck - 8)
            Rect 115 ($deck - 7) 8 7 'oak'
            Line 115 ($deck - 5) 122 ($deck - 5) 'darkwood'
            Line 115 ($deck - 2) 122 ($deck - 2) 'darkwood'
        }
        'troop' {
            Rect 75 ($deck - 9) 24 9 'maroon'
            Poly @(73,($deck - 10), 79,($deck - 15), 98,($deck - 15), 103,($deck - 10)) 'red'
            for ($x = 110; $x -lt 134; $x += 7) {
                Rect $x ($deck - 9) 3 3 'gold'
                Rect ($x - 1) ($deck - 11) 5 2 'ink'
                Rect ($x - 1) ($deck - 6) 5 6 'red'
                Rect ($x + 1) ($deck - 5) 1 4 'white'
            }
        }
        'cannon' {
            Rect 91 ($deck - 9) 17 8 'darkwood'
            Poly @(95,($deck - 14), 124,($deck - 17), 127,($deck - 16),
                127,($deck - 10), 95,($deck - 8)) 'slate'
            Line 97 ($deck - 13) 123 ($deck - 15) 'silver'
            Rect 125 ($deck - 17) 4 8 'ink'
            Rect 94 ($deck - 5) 5 5 'ink'
            Rect 105 ($deck - 5) 5 5 'ink'
        }
        'galleas' {
            for ($x = 51; $x -lt 126; $x += 10) {
                Line $x ($deck + 9) ($x - 12) 99 'ink'
                Line ($x + 1) ($deck + 9) ($x - 11) 99 'oak'
                Line ($x - 12) 96 ($x - 15) 100 'gold'
            }
        }
        'navy' {
            Line ($l + 17) ($deck + 13) ($r - 11) ($deck + 13) 'gold'
            Rect ($l + 2) ($deck - 7) 3 10 'gold'
            Rect ($r - 3) ($deck - 9) 3 6 'gold'
        }
        'pirate' {
            Line ($l + 9) ($deck + 4) ($r - 7) ($deck + 4) 'red'
            Rect 132 ($deck - 9) 3 7 'gold'
        }
    }
}

function TopView($s) {
    $cx = 32; $half = [int]($s.width / 2)
    $front = [int]((96 - $s.length) / 2); $back = $front + $s.length
    $l = $cx - $half; $r = $cx + $half
    $black = $s.kind -eq 'pirate'
    if ($s.kind -eq 'galleas') {
        for ($y = $front + 24; $y -lt $back - 10; $y += 7) {
            Line ($l + 1) $y ($l - 10) ($y + 7) 'darkwood'
            Line ($r - 1) $y ($r + 10) ($y + 7) 'darkwood'
            Rect ($l - 11) ($y + 6) 4 2 'oak'
            Rect ($r + 8) ($y + 6) 4 2 'oak'
        }
    }
    Line $cx ($front - 6) $cx ($front + 7) 'darkwood'
    Line ($cx + 1) ($front - 5) ($cx + 1) ($front + 5) 'oak'
    Poly @($cx,$front, ($r - 3),($front + 13), $r,($front + 25), $r,($back - 12),
        ($r - 4),$back, ($l + 4),$back, $l,($back - 12), $l,($front + 25), ($l + 3),($front + 13)) $(if ($black) { 'shadow' } else { 'wood' })
    Poly @($cx,($front + 5), ($r - 4),($front + 18), ($r - 3),($back - 13),
        ($r - 6),($back - 4), ($l + 6),($back - 4), ($l + 3),($back - 13), ($l + 4),($front + 18)) 'oak' 'darkwood'
    for ($x = $l + 5; $x -lt $r - 3; $x += 4) {
        Line $x ($front + 21) $x ($back - 6) 'plank'
    }
    Line ($l + 1) ($front + 25) ($l + 1) ($back - 12) $s.accent
    Line ($r - 1) ($front + 25) ($r - 1) ($back - 12) $s.accent
    Rect ($l + 5) ($back - 15) ($s.width - 9) 9 'darkwood'
    Rect ($l + 6) ($back - 14) ($s.width - 11) 6 $s.accent
    Line ($l + 6) ($back - 11) ($r - 6) ($back - 11) 'gold'
    if ($s.guns -gt 0) {
        $count = if ($s.kind -eq 'navy') { 7 } else { [Math]::Min(4, $s.guns) }
        for ($i = 0; $i -lt $count; $i++) {
            $y = $front + 25 + $i * 6
            Rect ($l - 3) $y 6 3 'ink'
            Rect ($r - 2) $y 6 3 'ink'
            Line ($l - 2) $y ($l + 1) $y 'steel'
            Line ($r - 1) $y ($r + 2) $y 'steel'
        }
    }
    if ($s.kind -eq 'merchant') {
        Crate ($cx - 8) ($back - 27)
        Crate ($cx + 1) ($back - 27)
    }
    if ($s.kind -eq 'troop') {
        for ($y = $front + 35; $y -le $back - 21; $y += 7) {
            foreach ($x in @(($cx - 8), ($cx + 5))) {
                Rect $x $y 4 5 'maroon'
                Rect $x $y 3 3 'coral'
                Rect ($x + 1) ($y + 3) 2 1 'white'
            }
        }
    }
    if ($s.kind -eq 'cannon') {
        Rect ($cx - 5) ($front + 17) 11 10 'darkwood'
        Rect ($cx - 3) ($front + 5) 7 19 'ink'
        Rect ($cx - 2) ($front + 7) 5 16 'slate'
        Line ($cx - 1) ($front + 8) ($cx - 1) ($front + 20) 'silver'
        Rect ($cx - 4) ($front + 5) 9 3 'ink'
    }
    $mastYs = switch ($s.kind) {
        'merchant' { @($front + 22) }
        'cannon' { @($front + 31) }
        'navy' { @(($front + 20), ($front + 40), ($front + 60)) }
        'troop' { @(($front + 22), ($front + 51)) }
        default { @(($front + 22), ($front + 46)) }
    }
    foreach ($y in $mastYs) {
        $span = $half + 7
        if ($s.kind -in @('schooner', 'galleas', 'cannon')) {
            $span = if ($s.kind -eq 'cannon') { 11 } else { $half + 7 }
            Poly @($cx,($y - 12), ($cx + $span),($y + 7), ($cx + 3),($y + 5)) 'sail'
            Line ($cx + 2) ($y - 7) ($cx + $span - 3) ($y + 5) 'white'
            Line ($cx - 4) ($y - 10) ($cx + $span + 1) ($y + 9) 'darkwood'
        } else {
            Poly @(($cx - $span),($y - 5), ($cx - 6),($y - 8), ($cx + $span),($y - 5),
                ($cx + $span - 2),($y + 5), ($cx + 4),($y + 8), ($cx - $span + 2),($y + 5)) $(if ($black) { 'shadow' } else { 'sail' })
            Line ($cx - $span + 3) ($y - 4) ($cx + $span - 3) ($y - 4) $(if ($black) { 'slate' } else { 'white' })
            Line ($cx - $span + 4) ($y + 4) ($cx + 4) ($y + 6) $(if ($black) { 'slate' } else { 'fold' })
            Line ($cx - $span - 1) ($y - 6) ($cx + $span + 1) ($y - 6) 'darkwood'
        }
        Rect ($cx - 1) ($y - 3) 3 7 'darkwood'
        Rect $cx ($y - 2) 1 4 'gold'
    }
    if ($black) { Skull ($cx - 5) ($mastYs[0] - 5) }
    if ($s.kind -eq 'navy') {
        Rect ($cx - 6) ($back - 13) 13 5 'red'
        Rect ($cx - 2) ($back - 13) 2 5 'white'
        Rect ($cx - 6) ($back - 11) 13 1 'white'
    }
}

$frames = [ordered]@{}
try {
    for ($index = 0; $index -lt $ships.Count; $index++) {
        $s = $ships[$index]
        $cellX = ($index % 2) * 256
        $cellY = [int][Math]::Floor($index / 2) * 128
        foreach ($view in @('topview', 'sideview')) {
            $x = $cellX + $(if ($view -eq 'topview') { 0 } else { 72 })
            $y = $cellY + 8
            $w = if ($view -eq 'topview') { 64 } else { 176 }
            $h = 112
            $script:ox = $x
            $script:oy = $y
            if ($view -eq 'topview') { $script:oy += 8; TopView $s } else { SideView $s }
            $frames["$($s.id)_$view"] = [ordered]@{
                frame = [ordered]@{ x = $x; y = $y; w = $w; h = $h }
                rotated = $false
                trimmed = $false
                spriteSourceSize = [ordered]@{ x = 0; y = 0; w = $w; h = $h }
                sourceSize = [ordered]@{ w = $w; h = $h }
                pivot = [ordered]@{ x = 0.5; y = $(if ($view -eq 'topview') { 0.5 } else { 91.0 / 112 }) }
            }
        }
    }
    $atlas = [ordered]@{
        frames = $frames
        meta = [ordered]@{
            app = 'KaptajnKaper enemy ship asset generator'
            version = '1.0'
            image = 'ships_enemy.png'
            format = 'RGBA8888'
            size = [ordered]@{ w = 512; h = 512 }
            scale = '1'
            palette = @($palette.Values)
            ships = @($ships | ForEach-Object { [ordered]@{ id = $_.id; name = $_.label } })
        }
    }
    [void](New-Item -ItemType Directory -Force -Path $OutputDirectory)
    $sheet.Save((Join-Path $OutputDirectory 'ships_enemy.png'), [System.Drawing.Imaging.ImageFormat]::Png)
    $atlas | ConvertTo-Json -Depth 10 | Set-Content -Encoding utf8 (Join-Path $OutputDirectory 'ships_enemy.json')
    Write-Output "Created ships_enemy.png (512x512, 24 colors + transparency) and ships_enemy.json (16 frames)."
} finally {
    $g.Dispose()
    $sheet.Dispose()
    foreach ($brush in $brushes.Values) { $brush.Dispose() }
    foreach ($pen in $pens.Values) { $pen.Dispose() }
}
