param(
    [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\assets\sprites')
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

# Deliberately opaque, discrete colors: no antialiasing or semitransparent edges.
$palette = [ordered]@{
    ink = '#172434'
    shadow = '#293747'
    iron = '#526070'
    steel = '#94A6AC'
    woodDark = '#50352F'
    wood = '#80503A'
    woodLight = '#AB7047'
    deck = '#C9935B'
    deckLight = '#E3B779'
    goldDark = '#9A703C'
    gold = '#E2B85B'
    goldLight = '#FFE39A'
    sailDark = '#8C9185'
    sailShade = '#BABCA5'
    sail = '#E6DFC0'
    sailLight = '#FFF4D6'
    redDark = '#842E3A'
    red = '#CB4450'
    white = '#FFFFFF'
    char = '#362B32'
    damageRed = '#FF4444'
}
$brushes = @{}
$pens = @{}
foreach ($entry in $palette.GetEnumerator()) {
    $color = [System.Drawing.ColorTranslator]::FromHtml($entry.Value)
    $brushes[$entry.Key] = [System.Drawing.SolidBrush]::new($color)
    $pens[$entry.Key] = [System.Drawing.Pen]::new($color, 1)
}

function Fill-Pixels([string]$Color, [int]$X, [int]$Y, [int]$Width, [int]$Height) {
    $script:graphics.FillRectangle($brushes[$Color], $X, $Y, $Width, $Height)
}

function Draw-PixelLine([string]$Color, [int]$X1, [int]$Y1, [int]$X2, [int]$Y2) {
    $script:graphics.DrawLine($pens[$Color], $X1, $Y1, $X2, $Y2)
}

function Fill-PixelPolygon([string]$Color, [int[]]$Coordinates) {
    $points = [System.Drawing.Point[]]::new($Coordinates.Length / 2)
    for ($i = 0; $i -lt $points.Length; $i++) {
        $points[$i] = [System.Drawing.Point]::new($Coordinates[2 * $i], $Coordinates[2 * $i + 1])
    }
    $script:graphics.FillPolygon($brushes[$Color], $points)
}

function New-ShipFrame([int]$DamageLevel, [int]$RockingPhase) {
    Write-Host "Generating frame: DamageLevel=$DamageLevel, RockingPhase=$RockingPhase"
    
    $image = [System.Drawing.Bitmap]::new(64, 64, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $script:graphics = [System.Drawing.Graphics]::FromImage($image)
    $script:graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
    $script:graphics.Clear([System.Drawing.Color]::Transparent)
    
    $lean = @(0, -1, 0, 1)[$RockingPhase]
    $billow = @(0, 1, 1, 0)[$RockingPhase]

    # Base ship hull and deck
    Fill-PixelPolygon ink @(32, 10, 37, 15, 42, 25, 44, 39, 42, 53, 38, 58, 26, 58, 22, 53, 20, 39, 22, 25, 27, 15)
    Fill-PixelPolygon woodDark @(32, 12, 37, 18, 41, 28, 42, 42, 40, 52, 37, 56, 27, 56, 24, 52, 22, 39, 24, 27, 28, 18)
    Fill-PixelPolygon woodLight @(32, 14, 36, 19, 39, 28, 40, 42, 38, 52, 26, 52, 24, 40, 26, 28, 29, 19)
    Fill-PixelPolygon deck @(32, 17, 35, 21, 38, 29, 39, 42, 37, 51, 27, 51, 25, 40, 27, 29, 30, 21)
    Fill-PixelPolygon deckLight @(32, 19, 34, 23, 36, 30, 37, 47, 34, 50, 29, 50, 27, 39, 29, 29)
    
    foreach ($x in @(29, 32, 35)) {
        Draw-PixelLine deck $x 25 $x 50
    }
    foreach ($y in @(29, 35, 41, 47)) {
        Draw-PixelLine woodLight 27 $y 37 $y
    }
    
    Draw-PixelLine gold 23 29 22 39
    Draw-PixelLine goldDark 22 40 25 52
    Draw-PixelLine goldLight 40 29 41 40
    Draw-PixelLine gold 41 41 38 53
    Fill-Pixels goldDark 26 54 12 2
    Fill-Pixels gold 27 54 10 1
    Fill-Pixels ink 29 57 6 2
    Fill-Pixels gold 30 56 4 1

    # Cannons on sides
    foreach ($y in @(30, 37, 44)) {
        Fill-Pixels ink 18 $y 6 3
        Fill-Pixels iron 18 $y 5 1
        Fill-Pixels ink 40 $y 6 3
        Fill-Pixels steel 41 $y 4 1
    }
    
    Fill-Pixels woodDark 29 46 7 5
    Fill-Pixels redDark 30 47 5 3
    Fill-Pixels gold 30 46 5 1
    Fill-Pixels goldLight 32 48 1 1
    Fill-Pixels ink 30 18 5 4
    Fill-Pixels iron 31 19 3 2

    # Standing rigging and mast
    Draw-PixelLine ink 31 4 31 20
    Draw-PixelLine woodLight 32 4 32 21
    Draw-PixelLine goldLight 32 4 32 8
    Draw-PixelLine sailDark 32 9 17 27
    Draw-PixelLine sailShade 33 10 47 27
    Draw-PixelLine woodDark 24 51 (31 + $lean) 22
    Draw-PixelLine woodDark 39 51 (33 + $lean) 22
    Draw-PixelLine sailDark 23 33 (32 + $lean) 40
    Draw-PixelLine sailDark 41 33 (32 + $lean) 40
    Fill-Pixels woodDark 33 24 2 21

    # Upper rigging (translates with lean)
    $script:graphics.TranslateTransform($lean, 0)
    Fill-PixelPolygon ink @(32, 10, 33, 10, 42, 20, 42, 22, 33, 21)
    Fill-PixelPolygon sailShade @(33, 12, 40, 20, 34, 20)
    Fill-PixelPolygon sailLight @(34, 14, 38, 19, 34, 19)

    # Two broad square sails with billowing
    Fill-PixelPolygon shadow @(12, 23, 19, 21, 44, 21, 52, 23, 50, 30, 45, 33, 19, 33, 14, 30)
    Fill-PixelPolygon sailDark @(14, 24, 20, 22, 44, 22, 50, 24, 48, 29, 44, 32, 20, 32, 16, 29)
    Fill-PixelPolygon sail @(15, 24, 21, 23, 43, 23, 49, 24, 47, 28, 43, (30 + $billow), 21, (30 + $billow), 17, 28)
    Fill-PixelPolygon sailLight @(17, 24, 22, 23, 42, 23, 47, 24, 45, 27, 19, 27)
    Draw-PixelLine sailShade 23 24 22 (29 + $billow)
    Draw-PixelLine sailShade 41 24 42 (29 + $billow)
    Draw-PixelLine woodDark 11 22 53 22
    Draw-PixelLine woodLight 13 22 51 22
    Fill-Pixels gold 31 21 3 3
    Fill-Pixels ink 31 24 3 2
    Fill-Pixels woodLight 32 24 1 2

    # Lower sails
    Fill-PixelPolygon shadow @(15, 37, 21, 35, 43, 35, 49, 37, 47, 43, 43, 46, 21, 46, 17, 43)
    Fill-PixelPolygon sailDark @(17, 38, 22, 36, 42, 36, 47, 38, 45, 42, 42, 45, 22, 45, 19, 42)
    Fill-PixelPolygon sail @(18, 38, 23, 37, 41, 37, 46, 38, 44, 41, 41, (43 + $billow), 23, (43 + $billow), 20, 41)
    Fill-PixelPolygon sailLight @(20, 38, 24, 37, 40, 37, 44, 38, 42, 40, 22, 40)
    Draw-PixelLine sailShade 25 38 24 (42 + $billow)
    Draw-PixelLine sailShade 39 38 40 (42 + $billow)
    Draw-PixelLine woodDark 14 36 50 36
    Draw-PixelLine woodLight 16 36 48 36
    Fill-Pixels gold 31 35 3 3
    Fill-Pixels ink 31 38 3 2
    Fill-Pixels woodLight 32 38 1 2

    # DAMAGE: tears and burns based on DamageLevel
    if ($DamageLevel -ge 1) {
        # Light damage: burned spots on sails - VISIBLE RED PATCHES
        Fill-Pixels damageRed 18 26 6 4
        Fill-Pixels redDark 19 27 4 2
    }
    if ($DamageLevel -ge 2) {
        # Medium damage: multiple burn marks and hull scorching
        Fill-Pixels damageRed 18 26 6 4
        Fill-Pixels redDark 19 27 4 2
        Fill-Pixels damageRed 40 40 5 4
        Fill-Pixels redDark 41 41 3 2
        Fill-Pixels char 36 25 5 3
    }
    if ($DamageLevel -ge 3) {
        # Severe damage: large burned areas and hull breach
        Fill-Pixels damageRed 18 26 6 4
        Fill-Pixels redDark 19 27 4 2
        Fill-Pixels damageRed 40 40 5 4
        Fill-Pixels redDark 41 41 3 2
        Fill-Pixels damageRed 25 28 7 5
        Fill-Pixels char 26 29 5 3
        Fill-Pixels char 36 25 5 3
    }
    
    $script:graphics.ResetTransform()

    # Stern damage
    if ($DamageLevel -ge 1) {
        Draw-PixelLine char 24 48 26 51
        Fill-Pixels woodDark 36 53 3 2
    }
    if ($DamageLevel -ge 2) {
        Fill-PixelPolygon char @(39, 46, 42, 46, 41, 50, 38, 52, 37, 50)
        Draw-PixelLine deckLight 38 47 39 48
        Draw-PixelLine char 27 53 31 54
        Fill-Pixels char 42 38 3 2
        Fill-Pixels damageRed 40 48 3 2
    }
    if ($DamageLevel -ge 3) {
        Fill-PixelPolygon char @(22, 39, 26, 40, 27, 45, 25, 49, 23, 47)
        Fill-Pixels ink 21 44 4 3
        Draw-PixelLine woodLight 25 42 26 44
        Fill-PixelPolygon char @(29, 51, 33, 50, 36, 53, 35, 56, 29, 56)
        Draw-PixelLine woodLight 30 52 33 53
        Fill-Pixels damageRed 23 45 4 3
    }

    # Dannebrog flag (always intact for identification)
    $flagY = @(0, -1, 0, 1)[$RockingPhase]
    Draw-PixelLine ink 33 48 33 59
    Draw-PixelLine gold 34 48 34 58
    Fill-PixelPolygon ink @(35, (49 + $flagY), 42, (49 + $flagY), 46, (51 + $flagY), 45, (57 + $flagY), 40, (55 + $flagY), 35, (55 + $flagY))
    Fill-Pixels red 35 (50 + $flagY) 7 5
    Fill-PixelPolygon redDark @(42, (50 + $flagY), 45, (52 + $flagY), 44, (56 + $flagY), 42, (54 + $flagY))
    Fill-Pixels white 37 (50 + $flagY) 1 5
    Fill-Pixels white 35 (52 + $flagY) 7 1
    Draw-PixelLine sail 42 (52 + $flagY) 44 (53 + $flagY)

    $script:graphics.Dispose()
    return ,$image
}

$null = New-Item -ItemType Directory -Force -Path $OutputDirectory
$sheet = [System.Drawing.Bitmap]::new(256, 256, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$sheetGraphics = [System.Drawing.Graphics]::FromImage($sheet)
$sheetGraphics.Clear([System.Drawing.Color]::Transparent)
$frames = [ordered]@{}
$animations = @()
$states = @('normal', 'light', 'medium', 'severe')

try {
    for ($row = 0; $row -lt 4; $row++) {
        Write-Host "Processing row $row (damage level $row)..."
        $animationFrames = @()
        for ($column = 0; $column -lt 4; $column++) {
            $name = "ship_player_$($states[$row])_$column"
            $frame = New-ShipFrame $row $column
            $sheetGraphics.DrawImageUnscaled($frame, $column * 64, $row * 64)
            $frame.Dispose()
            $frames[$name] = [ordered]@{
                frame = @{ x = $column * 64; y = $row * 64; w = 64; h = 64 }
                rotated = $false
                trimmed = $false
                spriteSourceSize = @{ x = 0; y = 0; w = 64; h = 64 }
                sourceSize = @{ w = 64; h = 64 }
                pivot = @{ x = 0.5; y = 0.5 }
            }
            $animationFrames += @{ key = 'ship_player'; frame = $name }
        }
        $animations += [ordered]@{
            key = "ship_player_$($states[$row])_rock"
            frames = $animationFrames
            frameRate = 4
            repeat = -1
        }
    }
    
    $atlas = [ordered]@{
        frames = $frames
        animations = @{ anims = $animations }
        meta = [ordered]@{
            app = 'Kaptajn Kaper original pixel-art generator'
            version = '1.0'
            image = 'ship_player.png'
            format = 'RGBA8888'
            size = @{ w = 256; h = 256 }
            scale = '1'
            facing = 'north'
            grid = @{ columns = 4; rows = 4; cellWidth = 64; cellHeight = 64 }
            rowOrder = $states
            columnOrder = @('rest', 'port', 'return', 'starboard')
            palette = @($palette.Values)
            animationImport = 'scene.anims.fromJSON(atlasData.animations)'
        }
    }
    
    $sheet.Save((Join-Path $OutputDirectory 'ship_player.png'), [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Host "Saved ship_player.png"
    
    $json = $atlas | ConvertTo-Json -Depth 12
    [System.IO.File]::WriteAllText(
        (Join-Path $OutputDirectory 'ship_player.json'),
        $json + [Environment]::NewLine,
        [System.Text.Encoding]::UTF8)
    Write-Host "Saved ship_player.json"
    
    Write-Host "✓ Successfully regenerated ship_player assets in $OutputDirectory"
}
finally {
    $sheetGraphics.Dispose()
    $sheet.Dispose()
}
