$ErrorActionPreference = 'Stop'
$projectDir = $PSScriptRoot
$url = 'http://127.0.0.1:5173'
$portableNode = Join-Path $projectDir '.tools\node\node.exe'
$viteCli = Join-Path $projectDir 'node_modules\vite\bin\vite.js'

try {
  $existing = Invoke-WebRequest -Uri $url -TimeoutSec 1 -UseBasicParsing
  if ($existing.StatusCode -eq 200) {
    Start-Process $url
    exit 0
  }
} catch { }

if (Test-Path -LiteralPath $portableNode) {
  $nodeExe = $portableNode
} else {
  $systemNode = Get-Command node -ErrorAction SilentlyContinue
  if (-not $systemNode) {
    Write-Error 'Instale Node.js 20 ou superior para executar o Checkmage. Consulte README.md.'
    exit 1
  }
  $nodeExe = $systemNode.Source
}

$nodeVersionOutput = & $nodeExe --version
if ($nodeVersionOutput -notmatch '^v(?<version>\d+\.\d+\.\d+)' -or [version]$Matches.version -lt [version]'20.19.0') {
  Write-Error 'O Checkmage requer Node.js 20.19 ou superior.'
  exit 1
}

if (-not (Test-Path -LiteralPath $viteCli)) {
  $corepack = Get-Command corepack -ErrorAction SilentlyContinue
  $pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
  $npm = Get-Command npm -ErrorAction SilentlyContinue

  if ($corepack) {
    & $corepack.Source pnpm install --frozen-lockfile
  } elseif ($pnpm) {
    & $pnpm.Source install --frozen-lockfile
  } elseif ($npm) {
    & $npm.Source install --no-package-lock
  } else {
    Write-Error 'Ative Corepack ou instale pnpm para restaurar as dependências do projeto.'
    exit 1
  }

  if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $viteCli)) {
    Write-Error 'Não foi possível instalar as dependências. Confira a conexão e tente novamente.'
    exit 1
  }
}

$server = Start-Process -FilePath $nodeExe -ArgumentList @($viteCli, '--host', '127.0.0.1', '--port', '5173', '--strictPort') -WorkingDirectory $projectDir -WindowStyle Hidden -PassThru
$ready = $false
for ($attempt = 0; $attempt -lt 20; $attempt++) {
  if ($server.HasExited) { break }
  try {
    $response = Invoke-WebRequest -Uri $url -TimeoutSec 1 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
      $ready = $true
      break
    }
  } catch {
    Start-Sleep -Milliseconds 400
  }
}

if (-not $ready) {
  if (-not $server.HasExited) { Stop-Process -Id $server.Id -Force }
  Write-Error 'Não foi possível iniciar o servidor local na porta 5173.'
  exit 1
}

Start-Process $url
