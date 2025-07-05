# Load environment variables from file
Get-Content "env.supabase" | ForEach-Object {
    if ($_ -match '^([^#][^=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
        Write-Host "Set $name = $value"
    }
}

Write-Host "Environment variables loaded successfully!"
Write-Host "Starting bot on port $env:PORT..."

# Start the bot
npm start 