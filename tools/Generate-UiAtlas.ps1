# Run from the repository root: powershell -NoProfile -File .\tools\Generate-UiAtlas.ps1
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$output = Join-Path $PSScriptRoot '..\assets\sprites'
[void][IO.Directory]::CreateDirectory($output)
$palette = @{
    ink = '#111C2B'; shadow = '#233247'; navy = '#30465D'; blue = '#486781'
    steel = '#7392A1'; silver = '#ADCDD0'; white = '#F6F0D4'
    darkwood = '#3E2C2B'; wood = '#6A4231'; leather = '#96603B'
    bronze = '#A8773E'; gold = '#D2A451'; lightgold = '#F4D784'
    paper = '#E4CCA0'; papershadow = '#C0A174'; cream = '#F1DFB6'
    skin = '#D59970'; skinlight = '#EFC59A'; skinshade = '#A9644D'
    red = '#AE4545'; lightred = '#EA7970'; darkred = '#672F43'
    teal = '#287C80'; aqua = '#48B8AF'; mint = '#A2E8CE'
    purple = '#695080'; violet = '#A080B1'; gray = '#787C7D'
}
$brushes = @{}
$pens = @{}
foreach ($key in $palette.Keys) {
    $color = [Drawing.ColorTranslator]::FromHtml($palette[$key])
    $brushes[$key] = [Drawing.SolidBrush]::new($color)
    $pens[$key] = [Drawing.Pen]::new($color, 1)
}
$atlas = [Drawing.Bitmap]::new(512, 256, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
$script:frames = [ordered]@{}
$script:descriptions = [ordered]@{}

function Rect($x, $y, $w, $h, $color) {
    $script:g.FillRectangle($brushes[$color], [int]$x, [int]$y, [int]$w, [int]$h)
}
function Line($x1, $y1, $x2, $y2, $color) {
    $script:g.DrawLine($pens[$color], [int]$x1, [int]$y1, [int]$x2, [int]$y2)
}
function Poly($coordinates, $color) {
    $points = [Drawing.Point[]]::new($coordinates.Count / 2)
    for ($i = 0; $i -lt $points.Count; $i++) {
        $points[$i] = [Drawing.Point]::new($coordinates[2 * $i], $coordinates[2 * $i + 1])
    }
    $script:g.FillPolygon($brushes[$color], $points)
}
function Oval($x, $y, $w, $h, $color) {
    $script:g.FillEllipse($brushes[$color], [int]$x, [int]$y, [int]$w, [int]$h)
}
function Sprite($name, $x, $y, $w, $h, $purpose, [scriptblock]$draw) {
    $sprite = [Drawing.Bitmap]::new($w, $h, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $script:g = [Drawing.Graphics]::FromImage($sprite)
    $script:g.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::None
    $script:g.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::None
    try {
        & $draw
        $target = [Drawing.Graphics]::FromImage($atlas)
        try { $target.DrawImageUnscaled($sprite, $x, $y) } finally { $target.Dispose() }
    } finally {
        $script:g.Dispose()
        $sprite.Dispose()
    }
    $script:frames[$name] = [ordered]@{
        frame = @{ x = $x; y = $y; w = $w; h = $h }
        rotated = $false
        trimmed = $false
        spriteSourceSize = @{ x = 0; y = 0; w = $w; h = $h }
        sourceSize = @{ w = $w; h = $h }
        pivot = @{ x = 0.5; y = 0.5 }
    }
    $script:descriptions[$name] = $purpose
}

function Sailor($x, $y, $back) {
    Poly @($x,($y+22), ($x+1),($y+17), ($x+6),($y+14), ($x+12),($y+14), ($x+17),($y+18), ($x+18),($y+22)) ink
    Rect ($x+2) ($y+18) 14 4 $(if ($back) { 'navy' } else { 'blue' })
    Poly @(($x+4),($y+17), ($x+8),($y+20), ($x+10),($y+20), ($x+14),($y+17)) white
    Rect ($x+8) ($y+19) 3 3 red
    Rect ($x+4) ($y+4) 11 11 ink
    Rect ($x+5) ($y+6) 9 8 skin
    Rect ($x+5) ($y+6) 7 5 skinlight
    Rect ($x+6) ($y+10) 1 1 ink
    Rect ($x+11) ($y+10) 1 1 ink
    Rect ($x+8) ($y+13) 3 1 skinshade
    Rect ($x+4) ($y+5) 2 5 wood
    Poly @(($x+2),($y+5), ($x+3),($y+2), ($x+6),$y, ($x+12),$y, ($x+15),($y+2), ($x+16),($y+5)) ink
    Rect ($x+4) ($y+2) 10 3 white
    Rect ($x+2) ($y+5) 14 2 navy
    Rect ($x+6) ($y+5) 7 1 steel
}

Sprite 'icon_crew' 4 4 32 32 'Mandskab: two sailors; crew count, recruitment and boarding strength.' {
    Sailor 12 3 $true
    Sailor 2 7 $false
}
Sprite 'icon_grain' 44 4 32 32 'Korn / proviant: tied grain sack and wheat; food stores and provisions trade.' {
    Poly @(9,8, 7,3, 12,4, 16,2, 21,4, 25,3, 22,9, 26,15, 28,24, 25,29, 7,29, 4,25, 5,17) ink
    Poly @(10,8, 9,5, 15,6, 17,4, 22,6, 20,9, 24,16, 26,24, 23,27, 8,27, 6,24, 7,17) bronze
    Poly @(10,12, 20,11, 23,19, 22,24, 19,26, 9,25, 8,20) paper
    Line 10 14 8 21 cream
    Line 23 20 24 24 leather
    Rect 9 9 13 3 wood
    Rect 10 9 11 1 lightgold
    Line 17 14 15 24 wood
    Poly @(17,14, 14,13, 14,16, 16,18) gold
    Poly @(18,16, 21,13, 21,17, 17,20) gold
    Poly @(15,18, 12,17, 12,20, 15,22) bronze
    Line 15 23 20 19 bronze
}
Sprite 'icon_cannon' 84 4 32 32 'Kanon: iron cannon on a wooden carriage; armament count and cannon purchases.' {
    Poly @(4,18, 18,18, 24,23, 27,25, 26,28, 4,28, 2,25) ink
    Rect 5 20 14 4 wood
    Line 5 20 18 20 bronze
    Poly @(5,13, 24,5, 27,6, 30,13, 27,16, 9,22, 5,20, 3,16) ink
    Poly @(6,13, 24,7, 27,13, 9,20, 6,18) navy
    Line 7 13 22 8 silver
    Line 8 15 23 10 steel
    Poly @(22,6, 25,5, 29,13, 26,15) steel
    Poly @(25,7, 27,8, 28,12, 27,13) ink
    Line 9 14 11 18 blue
    Rect 3 14 3 3 bronze
    Oval 6 20 11 11 ink
    Oval 8 22 7 7 bronze
    Oval 9 23 5 5 wood
    Line 11 22 11 28 gold
    Line 8 25 14 25 gold
    Rect 10 24 3 3 ink
    Oval 23 25 6 6 ink
    Rect 24 26 2 1 steel
}
Sprite 'icon_coin' 124 4 32 32 'Rigsdaler: gold crown-stamped coin and stack; money and prices.' {
    Oval 2 18 21 12 ink
    Rect 3 20 19 6 bronze
    Oval 3 17 19 9 gold
    Line 5 25 18 25 lightgold
    Line 5 27 18 27 wood
    Oval 7 2 23 24 ink
    Oval 8 3 21 22 bronze
    Oval 8 3 20 20 lightgold
    Oval 10 5 16 16 gold
    Oval 11 6 14 14 bronze
    Oval 12 7 13 13 gold
    Poly @(13,11, 16,13, 18,9, 20,13, 23,11, 22,17, 14,17) wood
    Poly @(14,10, 16,12, 18,8, 20,12, 22,10, 21,15, 15,15) lightgold
    Rect 14 17 9 2 lightgold
    Rect 11 6 3 1 white
    Rect 10 7 1 3 white
    Line 26 12 26 17 gold
}
Sprite 'icon_repair' 164 4 32 32 'Reparation: shipwright hammer over a plank; hull repair and maintenance.' {
    Poly @(3,20, 8,15, 27,24, 29,28, 26,31, 4,23) ink
    Poly @(5,20, 8,17, 26,25, 27,28, 25,29, 5,22) wood
    Line 8 19 24 26 bronze
    Rect 8 20 2 2 ink
    Rect 24 26 2 2 ink
    Poly @(6,26, 17,10, 22,12, 11,29, 8,30) ink
    Poly @(8,26, 18,12, 20,13, 10,28) leather
    Line 8 25 17 13 gold
    Poly @(11,6, 16,1, 21,3, 22,6, 28,9, 29,13, 25,17, 20,14, 20,12) ink
    Poly @(13,6, 16,3, 20,5, 20,7, 26,10, 26,13, 24,14, 20,11) steel
    Line 16 3 19 5 white
    Line 13 6 20 10 silver
    Poly @(23,9, 27,10, 27,13, 25,15, 23,13) blue
}
Sprite 'icon_jewels' 204 4 32 32 'Juveler: faceted ruby and emerald; treasure, loot and jewel sales.' {
    Poly @(2,18, 6,12, 14,12, 18,18, 10,28) ink
    Poly @(4,18, 7,14, 13,14, 16,18, 10,25) teal
    Poly @(7,14, 10,18, 4,18) mint
    Poly @(10,18, 13,14, 16,18, 10,25) aqua
    Poly @(9,9, 15,3, 25,3, 30,10, 20,25) ink
    Poly @(11,10, 16,5, 24,5, 28,10, 20,22) red
    Poly @(11,10, 16,5, 18,10) lightred
    Poly @(16,5, 24,5, 22,10, 18,10) white
    Poly @(24,5, 28,10, 22,10) lightred
    Poly @(11,11, 18,11, 20,22) darkred
    Poly @(18,11, 22,11, 20,21) lightred
    Line 28 22 28 28 lightgold
    Line 25 25 31 25 lightgold
    Rect 28 25 1 1 white
    Rect 5 5 1 5 white
    Rect 3 7 5 1 white
}

function Crosshair($color) {
    # Dark backing keeps the pale reticle legible against both sea and sails.
    Line 5 5 11 5 ink; Line 5 5 5 11 ink
    Line 20 5 26 5 ink; Line 26 5 26 11 ink
    Line 5 20 5 26 ink; Line 5 26 11 26 ink
    Line 20 26 26 26 ink; Line 26 20 26 26 ink
    Line 6 6 11 6 $color; Line 6 6 6 11 $color
    Line 20 6 25 6 $color; Line 25 6 25 11 $color
    Line 6 20 6 25 $color; Line 6 25 11 25 $color
    Line 20 25 25 25 $color; Line 25 20 25 25 $color
    Rect 14 1 4 9 ink; Rect 15 2 2 7 $color
    Rect 14 22 4 9 ink; Rect 15 23 2 7 $color
    Rect 1 14 9 4 ink; Rect 2 15 7 2 $color
    Rect 22 14 9 4 ink; Rect 23 15 7 2 $color
}
Sprite 'target_crosshair' 244 4 32 32 'Neutral aiming reticle; open center at (16,16) leaves the target visible.' { Crosshair white }
Sprite 'target_crosshair_locked' 284 4 32 32 'Coral aiming reticle for a selected or locked target; same alignment as neutral.' { Crosshair lightred }

function Button($w, $h, $state) {
    $edge = 'gold'; $top = 'blue'; $fill = 'navy'; $bottom = 'shadow'
    if ($state -eq 'hover') { $edge = 'lightgold'; $top = 'steel'; $fill = 'blue' }
    if ($state -eq 'pressed') { $top = 'shadow'; $fill = 'shadow'; $bottom = 'blue' }
    if ($state -eq 'disabled') { $edge = 'gray'; $top = 'navy'; $fill = 'shadow' }
    Poly @(3,0, ($w-4),0, ($w-1),3, ($w-1),($h-4), ($w-4),($h-1), 3,($h-1), 0,($h-4), 0,3) ink
    Rect 3 2 ($w-6) ($h-4) $edge
    Rect 2 3 ($w-4) ($h-6) $edge
    Rect 4 4 ($w-8) ($h-8) ink
    Rect 5 5 ($w-10) ($h-10) $fill
    Rect 5 5 ($w-10) 2 $top
    Rect 5 ($h-7) ($w-10) 2 $bottom
    foreach ($x in @(3, ($w-5))) {
        foreach ($y in @(3, ($h-5))) {
            Rect $x $y 2 2 bronze
            Rect $x $y 1 1 $(if ($state -eq 'disabled') { 'gray' } else { 'white' })
        }
    }
}
$states = @('normal', 'hover', 'pressed', 'disabled')
for ($i = 0; $i -lt 4; $i++) {
    $state = $states[$i]
    Sprite "button_square_$state" (324 + 40*$i) 4 32 32 "Unlabelled square button, $state state; place a glyph or icon above it." { Button 32 32 $state }
    $x = @(4,108,212,4)[$i]; $y = @(124,124,124,164)[$i]
    Sprite "button_primary_$state" $x $y 96 32 "Unlabelled text/action button, $state state; overlay localized text." { Button 96 32 $state }
}

$letters = @{
    N = @('10001','11001','10101','10011','10001')
    E = @('111','100','110','100','111')
    S = @('111','100','111','001','111')
    W = @('10001','10001','10101','10101','01010')
}
function Letter($letter, $x, $y) {
    $rows = $letters[$letter]
    for ($j = 0; $j -lt $rows.Count; $j++) {
        for ($i = 0; $i -lt $rows[$j].Length; $i++) {
            if ($rows[$j][$i] -eq '1') { Rect ($x+$i) ($y+$j) 1 1 cream }
        }
    }
}
Sprite 'compass_rose' 4 48 64 64 'Brass compass with N/E/S/W marks; fixed north-up navigation dial, center (32,32).' {
    Oval 1 1 62 62 ink
    Oval 3 3 58 58 bronze
    Oval 4 4 56 56 lightgold
    Oval 6 6 52 52 wood
    Oval 7 7 50 50 gold
    Oval 9 9 46 46 ink
    Oval 10 10 44 44 navy
    Oval 12 12 40 40 shadow
    foreach ($xy in @(@(13,13),@(48,13),@(13,48),@(48,48))) {
        Rect $xy[0] $xy[1] 3 3 wood
        Rect $xy[0] $xy[1] 2 1 white
    }
    Poly @(20,20, 32,26, 44,20, 38,32, 44,44, 32,38, 20,44, 26,32) bronze
    Poly @(32,16, 36,28, 48,32, 36,36, 32,48, 28,36, 16,32, 28,28) ink
    Poly @(32,17, 32,32, 28,28) lightred
    Poly @(32,17, 36,28, 32,32) red
    Poly @(33,32, 47,32, 36,28) white
    Poly @(33,32, 47,32, 36,36) steel
    Poly @(32,33, 32,47, 36,36) silver
    Poly @(32,33, 32,47, 28,36) blue
    Poly @(17,32, 31,32, 28,28) white
    Poly @(17,32, 31,32, 28,36) steel
    Letter N 30 10; Letter E 49 30; Letter S 31 49; Letter W 10 30
    Oval 28 28 9 9 ink; Oval 30 30 5 5 gold
    Rect 31 30 2 2 white
}
Sprite 'wind_arrow' 76 48 32 32 'Wind direction pointer; points north/up at rotation 0, rotates clockwise around (16,16).' {
    Poly @(16,1, 25,15, 20,14, 20,24, 24,29, 16,26, 8,29, 12,24, 12,14, 7,15) ink
    Poly @(16,4, 22,12, 18,11, 18,24, 21,27, 16,24, 11,27, 14,24, 14,11, 10,12) paper
    Poly @(16,4, 16,24, 11,27, 14,24, 14,11, 10,12) white
    Poly @(16,4, 22,12, 18,11, 18,16, 16,16) red
    Rect 15 14 3 4 ink
    Rect 16 15 1 2 gold
}
Sprite 'wind_calm' 116 48 32 32 'Calm wind marker; display instead of the directional pointer when wind speed is zero.' {
    Oval 6 6 20 20 ink; Oval 8 8 16 16 paper
    Oval 10 10 12 12 ink; Oval 11 11 10 10 shadow
    Rect 4 14 24 4 ink; Rect 5 15 22 2 white
}

$glyphs = @('plus','minus','close','left','right','check')
for ($i = 0; $i -lt $glyphs.Count; $i++) {
    $glyph = $glyphs[$i]
    Sprite "glyph_$glyph" (76+24*$i) 88 16 16 "Small $glyph overlay for quantity controls, navigation, dismissal or confirmation." {
        switch ($glyph) {
            plus { Rect 5 1 6 14 ink; Rect 1 5 14 6 ink; Rect 7 3 2 10 white; Rect 3 7 10 2 white }
            minus { Rect 1 5 14 6 ink; Rect 3 7 10 2 white }
            close {
                Poly @(2,1, 8,6, 13,1, 15,3, 10,8, 15,13, 13,15, 8,10, 3,15, 1,13, 6,8, 1,3) ink
                Line 3 3 12 12 white; Line 4 3 13 12 white
                Line 12 3 3 12 white; Line 13 3 4 12 white
            }
            left { Poly @(11,1, 13,3, 8,8, 13,13, 11,15, 3,8) ink; Poly @(10,4, 11,5, 8,8, 11,11, 10,12, 6,8) white }
            right { Poly @(4,1, 12,8, 4,15, 2,13, 7,8, 2,3) ink; Poly @(5,4, 9,8, 5,12, 4,11, 7,8, 4,5) white }
            check { Poly @(1,7, 4,5, 7,8, 12,1, 15,3, 7,14) ink; Poly @(3,8, 4,7, 7,10, 13,3, 13,5, 7,12) mint }
        }
    }
}

function Panel($w, $h, $parchment) {
    Poly @(4,0, ($w-5),0, ($w-1),4, ($w-1),($h-5), ($w-5),($h-1), 4,($h-1), 0,($h-5), 0,4) ink
    Rect 4 2 ($w-8) ($h-4) wood
    Rect 2 4 ($w-4) ($h-8) wood
    Rect 4 4 ($w-8) ($h-8) gold
    Rect 5 5 ($w-10) ($h-10) bronze
    Line 6 5 ($w-7) 5 lightgold
    Rect 7 7 ($w-14) ($h-14) ink
    Rect 8 8 ($w-16) ($h-16) $(if ($parchment) { 'papershadow' } else { 'blue' })
    Rect 10 10 ($w-20) ($h-20) $(if ($parchment) { 'paper' } else { 'navy' })
    Rect 12 12 ($w-24) ($h-24) $(if ($parchment) { 'cream' } else { 'shadow' })
    foreach ($x in @(3, ($w-9))) {
        foreach ($y in @(3, ($h-9))) {
            Rect $x $y 6 6 ink
            Rect ($x+1) ($y+1) 4 4 bronze
            Rect ($x+1) ($y+1) 3 2 lightgold
            Rect ($x+2) ($y+2) 1 1 white
        }
    }
}
Sprite 'panel_navy' 344 48 160 96 'Dark brass-framed panel for combat, inventory and dialogs; use light text.' { Panel 160 96 $false }
Sprite 'panel_parchment' 344 152 160 96 'Parchment brass-framed panel for harbor trading, prices and messages; use dark text.' { Panel 160 96 $true }
Sprite 'panel_resource_bar' 108 164 224 80 'Wide navy resource/status panel; use light text and the six resource icons.' { Panel 224 80 $false }

$metadata = [ordered]@{
    frames = $script:frames
    meta = [ordered]@{
        app = 'Kaptajn Kaper UI atlas generator'
        version = '1.0'
        image = 'ui_atlas.png'
        format = 'RGBA8888'
        size = @{ w = 512; h = 256 }
        scale = '1'
    }
}
try {
    $atlas.Save((Join-Path $output 'ui_atlas.png'), [Drawing.Imaging.ImageFormat]::Png)
    $utf8 = [Text.UTF8Encoding]::new($false)
    [IO.File]::WriteAllText((Join-Path $output 'ui_atlas.json'), ($metadata | ConvertTo-Json -Depth 8) + "`n", $utf8)
    $doc = @(
        'KAPTAJN KAPER - UI ATLAS'
        '======================='
        ''
        'Original pixel artwork: 512 x 256 RGBA PNG, 28-color shared palette.'
        'Style: 16-bit nautical; dark ink outlines, brass, navy, parchment, upper-left lighting.'
        'No antialiasing; alpha is 0 or 255. Frames are untrimmed and never rotated.'
        'At least 4 transparent pixels separate frame rectangles. No edge extrusion.'
        ''
        'NAMING'
        'Lowercase ASCII snake_case, no filename suffix on frame keys.'
        'icon_<resource>: 32x32 resource icons; English stable keys, Danish UI labels.'
        'button_<shape>_<state>: normal, hover, pressed, disabled; labels are separate.'
        'panel_<material_or_role>: backgrounds; target_<kind>[_locked]: aiming overlays.'
        'compass_rose / wind_<kind>: navigation; glyph_<action>: 16x16 control overlays.'
        ''
        'FRAME REFERENCE (size; atlas x,y; purpose)'
    )
    foreach ($name in $script:frames.Keys) {
        $f = $script:frames[$name].frame
        $doc += "$name ($($f.w)x$($f.h); $($f.x),$($f.y)): $($script:descriptions[$name])"
    }
    $doc += @(
        ''
        'PHASER 3 INTEGRATION'
        "Preload: this.load.atlas('ui', 'assets/sprites/ui_atlas.png', 'assets/sprites/ui_atlas.json');"
        "Create:  this.add.image(24, 24, 'ui', 'icon_coin');"
        'Use pixelArt: true, antialias: false, roundPixels: true in the game config.'
        'Prefer integer positions and integer scaling (1x, 2x, 3x); avoid linear filtering.'
        'Paths above are browser URLs, relative to the deployed web root.'
        'The atlas uses the Phaser-compatible TexturePacker JSON hash format.'
        ''
        'BUTTONS AND PANELS'
        'No baked-in text: use a font supporting Danish U+00E6, U+00F8, U+00E5 and uppercase forms.'
        'Primary button text-safe rectangle: x=12, y=8, w=72, h=16.'
        'Square buttons: center a 16x16 glyph; move label/glyph down 1 pixel when pressed.'
        'Disabled artwork is visual only: disable input in game code too.'
        'Panels: leave 16 pixels of content padding on all four edges.'
        'Nine-slice borders: buttons 8 pixels per side; panels 12 pixels per side.'
        'Phaser 3.60+ example (width, height, left, right, top, bottom):'
        "this.add.nineslice(200, 150, 'ui', 'panel_navy', 240, 144, 12, 12, 12, 12);"
        'Use native sizes or nine-slicing to preserve corner detail; do not stretch whole panels.'
        ''
        'AIMING AND WIND'
        'Crosshairs share a (16,16) center with a transparent opening; use origin (0.5,0.5).'
        'Place wind_arrow at the compass center with origin (0.5,0.5).'
        'Angle convention: 0=north/up, 90=east/right, 180=south, 270=west.'
        'The arrow indicates where wind blows TO. Add 180 degrees for FROM bearings.'
        'Show wind_calm instead of wind_arrow at zero wind speed.'
        'Rotation at arbitrary angles may introduce pixel shimmer; prefer 45-degree steps.'
        'Compass W is international west (Danish vest); the dial stays north-up.'
        ''
        'REGENERATION'
        'Windows PowerShell with built-in System.Drawing; no third-party dependencies.'
        'From repository root: powershell -NoProfile -File .\tools\Generate-UiAtlas.ps1'
        'Regenerates PNG, JSON and this reference together. Original BASIC assets are untouched.'
    )
    [IO.File]::WriteAllText((Join-Path $output 'ui_atlas.txt'), ($doc -join "`n") + "`n", $utf8)
} finally {
    $atlas.Dispose()
    foreach ($brush in $brushes.Values) { $brush.Dispose() }
    foreach ($pen in $pens.Values) { $pen.Dispose() }
}
Write-Output "Created ui_atlas.png, ui_atlas.json and ui_atlas.txt ($($script:frames.Count) frames)."
