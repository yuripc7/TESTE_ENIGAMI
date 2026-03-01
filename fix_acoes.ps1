$file = 'components\ColaboradorTab.tsx'
$content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)

# Fix garbled ACOES text - multiple possible garbled patterns
$content = $content -replace 'A[^\x00-\x7F\s]+ES', 'AÇÕES'

[System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)
Write-Host 'Done - fixed garbled text'

# Also fix App.tsx if needed
$file2 = 'App.tsx'
$content2 = [System.IO.File]::ReadAllText($file2, [System.Text.Encoding]::UTF8)
$content2 = $content2 -replace 'A[^\x00-\x7F\s]+ES', 'AÇÕES'
[System.IO.File]::WriteAllText($file2, $content2, [System.Text.Encoding]::UTF8)
Write-Host 'Done - fixed App.tsx too'
