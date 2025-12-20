param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$InputFile,

    [Parameter(Mandatory=$false, Position=1)]
    [string]$OutputFile,

    [switch]$InPlace
)

if (-not (Test-Path -Path $InputFile -PathType Leaf)) {
    Write-Error "Input file '$InputFile' not found."
    exit 2
}

try {
    $rows = Import-Csv -Path $InputFile -ErrorAction Stop
} catch {
    Write-Error "Failed to read CSV: $_"
    exit 3
}

if ($rows.Count -eq 0) {
    Write-Warning "Input CSV contains no data rows. Nothing to sort."
    if ($InPlace) { return }
    if ($PSBoundParameters.ContainsKey('OutputFile')) { Copy-Item -Path $InputFile -Destination $OutputFile -Force; return }
    return
}

# Determine header property order and identify Chester column (second column)
$propNames = $rows[0].PSObject.Properties.Name
if ($propNames.Count -lt 2) {
    Write-Error "Input CSV does not have at least two columns; cannot find Chester as second column."
    exit 4
}

$chesterName = $propNames[1]

Write-Verbose "Sorting by Chester column: $chesterName"

# Decide whether TrialNumber column exists
$hasTrial = $propNames -contains 'TrialNumber'

if ($hasTrial) {
    # Sort by Chester (case-insensitive) then TrialNumber (numeric when possible)
    $sorted = $rows | Sort-Object -Property @{Expression = { ($_.$chesterName -as [string]).ToLower() }},
                                         @{Expression = { if ($_.TrialNumber -match '^\d+$') { [int]$_.TrialNumber } else { $_.TrialNumber } }}
} else {
    # Only sort by Chester
    $sorted = $rows | Sort-Object -Property @{Expression = { ($_.$chesterName -as [string]).ToLower() }}
}

# Export preserving original column order
$propOrder = $propNames

if ($InPlace) {
    $sorted | Select-Object $propOrder | Export-Csv -Path $InputFile -NoTypeInformation -Encoding UTF8
    Write-Output "Updated (in-place) sorted file: $InputFile"
} elseif ($PSBoundParameters.ContainsKey('OutputFile')) {
    $sorted | Select-Object $propOrder | Export-Csv -Path $OutputFile -NoTypeInformation -Encoding UTF8
    Write-Output "Wrote sorted file: $OutputFile"
} else {
    # Print to stdout (CSV text) so caller can redirect
    $sorted | Select-Object $propOrder | ConvertTo-Csv -NoTypeInformation | ForEach-Object { $_ }
}
