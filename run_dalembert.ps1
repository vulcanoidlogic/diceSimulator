# run_dalembert.ps1
# PowerShell script to run DAlembertAfterExtreme many times and append output to dalembert.log
# Usage: run this from the repository root (where DAlembertAfterExtreme folder lives)

$project = "DAlembertAfterExtreme"
$runs = 1000
$trials = 3000
$bankroll = 90
$z = 2.5
$log = "dalembert.log"

# Remove previous log if present
if (Test-Path $log) { Remove-Item $log -Force }

Write-Output "Starting batch: $runs runs | $trials trials each | Bankroll: $bankroll | zThreshold: $z"
Write-Output "Logging to: $log"

for ($i = 1; $i -le $runs; $i++) {
    $header = "===== Run $i of $runs - $(Get-Date -Format o) ====="
    $header | Out-File -FilePath $log -Append -Encoding UTF8

    try {
        # Run the specific project and capture both stdout/stderr
        $procOutput = & dotnet run --project $project -- $trials $bankroll $z 2>&1
        $exit = $LASTEXITCODE

        # Append output to log using a consistent UTF8 encoding to avoid mixed-encoding NULs
        $procOutput | Out-File -FilePath $log -Append -Encoding UTF8

        # Also show run output in console
        $procOutput | Write-Output

        if ($exit -ne 0) {
            "[ERROR] Run $i exited with code $exit" | Out-File -FilePath $log -Append -Encoding UTF8
        }
    }
    catch {
        "[EXCEPTION] Run $i failed: $_" | Out-File -FilePath $log -Append -Encoding UTF8
    }

    "" | Out-File -FilePath $log -Append -Encoding UTF8
}

Write-Output "Batch complete. See $log for details."