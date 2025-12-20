param(
    [Alias('Input')]
    [Parameter(Mandatory=$true, Position=0)]
    [string]
    $InputPath,

    [Alias('Out','OutFile')]
    [Parameter(Position=1)]
    [string]
    $Output,

    [int]
    $GroupSize = 30,

    [switch]
    $InPlace
)

function Show-Usage {
    @"
Usage: [add_trial_number.ps1](http://_vscodecontentref_/1) -InputPath <input.csv> [-Output <out.csv>] [-GroupSize <30>] [-InPlace]

Inserts a zero-padded 6-digit 'TrialNumber' column as the first column grouping
every <GroupSize> data rows as one trial (default 30). Examples:

  # write to a new file
  [add_trial_number.ps1](http://_vscodecontentref_/2) -InputPath .\data\in.csv -Output .\data\out.csv

  # overwrite input file
  [add_trial_number.ps1](http://_vscodecontentref_/3) -InputPath .\data\in.csv -InPlace

You may also use the alias -Input for -InputPath and -Out or -OutFile for -Output.
"@
}

if ($PSBoundParameters.ContainsKey('InputPath') -eq $false) {
    Show-Usage
    exit 1
}

if ($InPlace -and $PSBoundParameters.ContainsKey('Output')) {
    Write-Error "Cannot specify -InPlace and -Output together. Choose one."
    exit 2
}

if ($InPlace) { $Output = $InputPath }
elseif (-not $PSBoundParameters.ContainsKey('Output')) {
    Write-Error "When not using -InPlace you must provide -Output <file>"
    exit 2
}

if (-not (Test-Path -Path $InputPath -PathType Leaf)) {
    Write-Error "Input file not found: $InputPath"
    exit 3
}

try {
    $rows = Import-Csv -Path $InputPath -ErrorAction Stop
} catch {
    Write-Error "Failed to read CSV: $_"
    exit 4
}

# If no data rows, preserve header and write header-only output with TrialNumber
if ($rows.Count -eq 0) {
    $headerLine = Get-Content -Path $InputPath -TotalCount 1 -ErrorAction Stop
    $headerNames = ($headerLine -split ',') | ForEach-Object { $_.Trim('"') }
    $propOrder = @('TrialNumber') + $headerNames
    $outHeader = ($propOrder -join ',')
    Set-Content -Path $Output -Value $outHeader -Encoding UTF8
    Write-Output "Wrote header-only CSV to: $Output"
    exit 0
}

# Assign TrialNumber in input order, grouped by $GroupSize, zero-padded to 6 digits
for ($i = 0; $i -lt $rows.Count; $i++) {
    $trialNum = [int](([math]::Floor($i / $GroupSize))) + 1
    $trialStr = $trialNum.ToString("D6")   # zero-pad to width 6
    $rows[$i] | Add-Member -NotePropertyName 'TrialNumber' -NotePropertyValue $trialStr -Force
}

# Ensure TrialNumber is the first column when exported
$propNames = $rows[0].PSObject.Properties.Name
$propOrder = @('TrialNumber') + ($propNames | Where-Object { $_ -ne 'TrialNumber' })
$rows | Select-Object $propOrder | Export-Csv -Path $Output -NoTypeInformation -Encoding UTF8

Write-Output "Wrote CSV with TrialNumber to: $Output"