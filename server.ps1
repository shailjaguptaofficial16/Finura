# Finura Web Server & REST API Backend
# Runs on http://localhost:3000

$port = 3000
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

# Helper function to get Content-Type
function Get-ContentType($filePath) {
    $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
    switch ($ext) {
        ".html" { return "text/html; charset=utf-8" }
        ".css"  { return "text/css; charset=utf-8" }
        ".js"   { return "application/javascript; charset=utf-8" }
        ".png"  { return "image/png" }
        ".jpg"  { return "image/jpeg" }
        ".jpeg" { return "image/jpeg" }
        ".svg"  { return "image/svg+xml" }
        ".ico"  { return "image/x-icon" }
        ".json" { return "application/json; charset=utf-8" }
        default { return "application/octet-stream" }
    }
}

# Helper to read database
function Get-Database {
    $dbPath = Join-Path $PSScriptRoot "db.json"
    if (Test-Path $dbPath) {
        $content = Get-Content -Raw -Path $dbPath
        return ConvertFrom-Json $content
    }
    return @{ users = @(); sessions = @(); faq = @(); blog = @() }
}

# Helper to write database
function Save-Database($db) {
    $dbPath = Join-Path $PSScriptRoot "db.json"
    $json = ConvertTo-Json -InputObject $db -Depth 100
    Set-Content -Path $dbPath -Value $json
}

# Helper to write JSON response
function Send-JsonResponse($response, $status, $object) {
    $json = ConvertTo-Json -InputObject $object -Depth 100
    $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
    
    $response.StatusCode = $status
    $response.ContentType = "application/json; charset=utf-8"
    $response.ContentLength64 = $buffer.Length
    $response.Headers.Add("Access-Control-Allow-Origin", "*")
    $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization")
    $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    
    $response.OutputStream.Write($buffer, 0, $buffer.Length)
    $response.OutputStream.Close()
}

# Helper to write plain text response
function Send-TextResponse($response, $status, $text, $contentType = "text/plain") {
    $buffer = [System.Text.Encoding]::UTF8.GetBytes($text)
    
    $response.StatusCode = $status
    $response.ContentType = $contentType
    $response.ContentLength64 = $buffer.Length
    $response.Headers.Add("Access-Control-Allow-Origin", "*")
    
    $response.OutputStream.Write($buffer, 0, $buffer.Length)
    $response.OutputStream.Close()
}

# Start listening
try {
    $listener.Start()
    Write-Host "Finura Full-Stack Server listening at http://localhost:$port/"
    Write-Host "Press Ctrl+C to stop the server"
} catch {
    Write-Error "Failed to start listener: $_"
    exit 1
}

# Main Loop
while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $url = $request.Url.LocalPath
        $method = $request.HttpMethod
        
        Write-Host "[$([DateTime]::Now.ToString("HH:mm:ss"))] $method $url"

        # Handle Preflight OPTIONS requests
        if ($method -eq "OPTIONS") {
            $response.StatusCode = 200
            $response.Headers.Add("Access-Control-Allow-Origin", "*")
            $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization")
            $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            $response.OutputStream.Close()
            continue
        }

        # ------------------ REST API ENDPOINTS ------------------
        if ($url.StartsWith("/api/")) {
            $db = Get-Database
            
            # Read request body
            $body = ""
            if ($request.HasEntityBody) {
                $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                $body = $reader.ReadToEnd()
                $reader.Close()
            }
            
            # API: Register
            if ($url -eq "/api/register" -and $method -eq "POST") {
                $data = ConvertFrom-Json $body
                
                # Validation
                if ([string]::IsNullOrEmpty($data.username) -or [string]::IsNullOrEmpty($data.password) -or [string]::IsNullOrEmpty($data.email)) {
                    Send-JsonResponse $response 400 @{ error = "Username, email, and password are required" }
                    continue
                }
                
                # Check duplicate username
                $existing = $db.users | Where-Object { $_.username -eq $data.username }
                if ($existing) {
                    Send-JsonResponse $response 400 @{ error = "Username already exists" }
                    continue
                }
                
                # Create user
                $newUser = @{
                    id = "user_" + [Guid]::NewGuid().ToString().Substring(0, 8)
                    username = $data.username
                    password = $data.password
                    email = $data.email
                    fullName = if ($data.fullName) { $data.fullName } else { $data.username }
                    balance = 21340.30
                    monthly_income = 2703.45
                    monthly_expense = 1174.50
                    savings_goal = 50000.00
                    transactions = @(
                        @{
                            id = "tx_init"
                            type = "income"
                            category = "Salary"
                            amount = 21340.30
                            date = [DateTime]::UtcNow.ToString("yyyy-MM-dd")
                            description = "Initial balance payout"
                        }
                    )
                    investments = @(
                        @{ name = "Global Equity Index"; value = 12500.00; change = 8.4 },
                        @{ name = "Tech Growth ETF"; value = 5400.00; change = 12.1 },
                        @{ name = "Government Green Bonds"; value = 3440.30; change = 3.2 }
                    )
                }
                
                # Save user to DB
                $usersList = [System.Collections.ArrayList]($db.users)
                $null = $usersList.Add($newUser)
                $db.users = $usersList
                
                Save-Database $db
                
                Send-JsonResponse $response 201 @{ message = "Registration successful"; username = $data.username }
                continue
            }
            
            # API: Login
            elseif ($url -eq "/api/login" -and $method -eq "POST") {
                $data = ConvertFrom-Json $body
                
                # Find user
                $user = $db.users | Where-Object { $_.username -eq $data.username -and $_.password -eq $data.password }
                
                if (-not $user) {
                    Send-JsonResponse $response 401 @{ error = "Invalid username or password" }
                    continue
                }
                
                # Create session
                $token = [Guid]::NewGuid().ToString()
                $session = @{
                    token = $token
                    username = $user.username
                    expires = [DateTime]::UtcNow.AddHours(2).ToString("yyyy-MM-ddTHH:mm:ssZ")
                }
                
                $sessionsList = [System.Collections.ArrayList]($db.sessions)
                $null = $sessionsList.Add($session)
                $db.sessions = $sessionsList
                
                Save-Database $db
                
                # Return token & safe user profile
                $safeUser = @{
                    username = $user.username
                    email = $user.email
                    fullName = $user.fullName
                    balance = $user.balance
                }
                
                Send-JsonResponse $response 200 @{ token = $token; user = $safeUser }
                continue
            }
            
            # Authenticated API routes
            else {
                # Verify token
                $authHeader = $request.Headers["Authorization"]
                $token = ""
                if ($authHeader -and $authHeader.StartsWith("Bearer ")) {
                    $token = $authHeader.Substring(7)
                }
                
                $session = $db.sessions | Where-Object { $_.token -eq $token }
                
                if (-not $session) {
                    Send-JsonResponse $response 401 @{ error = "Unauthorized. Invalid or missing token." }
                    continue
                }
                
                # Expiry check
                $expiry = [DateTime]::Parse($session.expires)
                if ($expiry -lt [DateTime]::UtcNow) {
                    # Remove expired session
                    $sessionsList = [System.Collections.ArrayList]($db.sessions)
                    $sessionsList.Remove($session)
                    $db.sessions = $sessionsList
                    Save-Database $db
                    
                    Send-JsonResponse $response 401 @{ error = "Session expired." }
                    continue
                }
                
                # Find current user
                $user = $db.users | Where-Object { $_.username -eq $session.username }
                
                if (-not $user) {
                    Send-JsonResponse $response 404 @{ error = "User not found" }
                    continue
                }
                
                # API: Get User Info
                if ($url -eq "/api/user" -and $method -eq "GET") {
                    # Return safe user object (omit password)
                    $safeUser = @{
                        id = $user.id
                        username = $user.username
                        email = $user.email
                        fullName = $user.fullName
                        balance = $user.balance
                        monthly_income = $user.monthly_income
                        monthly_expense = $user.monthly_expense
                        savings_goal = $user.savings_goal
                        transactions = $user.transactions
                        investments = $user.investments
                    }
                    Send-JsonResponse $response 200 $safeUser
                    continue
                }
                
                # API: Add Transaction
                elseif ($url -eq "/api/transaction" -and $method -eq "POST") {
                    $txData = ConvertFrom-Json $body
                    
                    if ([string]::IsNullOrEmpty($txData.type) -or [string]::IsNullOrEmpty($txData.category) -or -not $txData.amount) {
                        Send-JsonResponse $response 400 @{ error = "Type, category, and amount are required" }
                        continue
                    }
                    
                    # Create transaction object
                    $newTx = @{
                        id = "tx_" + [Guid]::NewGuid().ToString().Substring(0, 8)
                        type = $txData.type # "income", "expense", "investment"
                        category = $txData.category
                        amount = [double]$txData.amount
                        date = [DateTime]::UtcNow.ToString("yyyy-MM-dd")
                        description = if ($txData.description) { $txData.description } else { "" }
                    }
                    
                    # Update User Balance
                    # In PowerShell JSON deserialization, numeric fields might need casts
                    $currentBalance = [double]$user.balance
                    if ($txData.type -eq "income") {
                        $currentBalance += $newTx.amount
                        $user.monthly_income = [double]$user.monthly_income + $newTx.amount # simple stats adjustment
                    } elseif ($txData.type -eq "expense") {
                        $currentBalance -= $newTx.amount
                        $user.monthly_expense = [double]$user.monthly_expense + $newTx.amount
                    } elseif ($txData.type -eq "investment") {
                        # Investments transfer balance into assets
                        $currentBalance -= $newTx.amount
                        
                        # Add or update investment
                        $invName = $txData.category # Category serves as the asset name
                        $existingInv = $user.investments | Where-Object { $_.name -eq $invName }
                        
                        if ($existingInv) {
                            $existingInv.value = [double]$existingInv.value + $newTx.amount
                        } else {
                            $newInv = @{
                                name = $invName
                                value = $newTx.amount
                                change = 0.0
                            }
                            $invsList = [System.Collections.ArrayList]($user.investments)
                            $null = $invsList.Add($newInv)
                            $user.investments = $invsList
                        }
                    }
                    
                    $user.balance = $currentBalance
                    
                    # Add to transactions list
                    $txsList = [System.Collections.ArrayList]($user.transactions)
                    $null = $txsList.Add($newTx)
                    $user.transactions = $txsList
                    
                    # Save DB
                    Save-Database $db
                    
                    Send-JsonResponse $response 201 @{ message = "Transaction recorded"; balance = $user.balance }
                    continue
                }
                
                # API: Logout
                elseif ($url -eq "/api/logout" -and $method -eq "POST") {
                    $sessionsList = [System.Collections.ArrayList]($db.sessions)
                    $sessionsList.Remove($session)
                    $db.sessions = $sessionsList
                    Save-Database $db
                    
                    Send-JsonResponse $response 200 @{ message = "Logged out successfully" }
                    continue
                }
                
                else {
                    Send-JsonResponse $response 404 @{ error = "API Endpoint Not Found" }
                    continue
                }
            }
        }
        
        # ------------------ STATIC FILE SERVER ------------------
        # Default route maps to index.html
        $reqPath = $url
        if ($reqPath -eq "/") {
            $reqPath = "/index.html"
        }
        
        # Clean relative path to prevent directory traversal
        $reqPath = $reqPath.Replace("/", "\")
        if ($reqPath.StartsWith("\")) {
            $reqPath = $reqPath.Substring(1)
        }
        
        # File could be in public directory or workspace root (for inspiration.png)
        $publicFilePath = Join-Path $PSScriptRoot "public\$reqPath"
        $rootFilePath = Join-Path $PSScriptRoot "$reqPath"
        
        $targetFilePath = ""
        if (Test-Path $publicFilePath) {
            $targetFilePath = $publicFilePath
        } elseif (Test-Path $rootFilePath) {
            $targetFilePath = $rootFilePath
        }
        
        if ($targetFilePath -and -not (Test-Path $targetFilePath -PathType Container)) {
            $contentType = Get-ContentType $targetFilePath
            $response.ContentType = $contentType
            $response.StatusCode = 200
            $response.Headers.Add("Access-Control-Allow-Origin", "*")
            
            # Write binary response for files (crucial for images!)
            $fileBytes = [System.IO.File]::ReadAllBytes($targetFilePath)
            $response.ContentLength64 = $fileBytes.Length
            $response.OutputStream.Write($fileBytes, 0, $fileBytes.Length)
            $response.OutputStream.Close()
        } else {
            # File Not Found
            Send-TextResponse $response 404 "404 Not Found: The file '$url' does not exist." "text/plain"
        }
        
    } catch {
        Write-Error "Error handling request: $_"
        if ($response) {
            try {
                Send-TextResponse $response 500 "500 Internal Server Error: $_" "text/plain"
            } catch {}
        }
    }
}
