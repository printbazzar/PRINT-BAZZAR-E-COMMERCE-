param (
    [string]$commitMessage = "Automated update via Antigravity"
)

$gitExe = "C:\Users\Dell\AppData\Local\GitHubDesktop\app-3.6.5\resources\app\git\cmd\git.exe"

$code = @'
using System;
using System.Runtime.InteropServices;
using System.Text;

public class PushCredHelper {
    [DllImport("Advapi32.dll", SetLastError = true, EntryPoint = "CredReadW", CharSet = CharSet.Unicode)]
    public static extern bool CredRead(string target, int type, int reservedFlag, out IntPtr credentialPtr);

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct CREDENTIAL {
        public int Flags;
        public int Type;
        public string TargetName;
        public string Comment;
        public long LastWritten;
        public int CredentialBlobSize;
        public IntPtr CredentialBlob;
        public int Persist;
        public int AttributeCount;
        public IntPtr Attributes;
        public string TargetAlias;
        public string UserName;
    }

    public static string GetSecret(string target) {
        IntPtr ptr;
        if (CredRead(target, 1, 0, out ptr)) {
            CREDENTIAL cred = (CREDENTIAL)Marshal.PtrToStructure(ptr, typeof(CREDENTIAL));
            byte[] bytes = new byte[cred.CredentialBlobSize];
            Marshal.Copy(cred.CredentialBlob, bytes, 0, cred.CredentialBlobSize);
            return Encoding.UTF8.GetString(bytes);
        }
        return null;
    }
}
'@

if (-not ([System.Management.Automation.PSTypeName]'PushCredHelper').Type) {
    Add-Type -TypeDefinition $code
}

$token = [PushCredHelper]::GetSecret("GitHub - https://api.github.com/printbazzar")
if (-not $token) {
    Write-Error "GitHub token not found in Windows Credential Manager."
    exit 1
}

# Set remote with authenticated token
$remoteUrl = "https://$($token)@github.com/printbazzar/PRINT-BAZZAR-E-COMMERCE-.git"
& $gitExe remote set-url origin $remoteUrl

# Stage changes
& $gitExe add -A

# Check if changes exist
$status = & $gitExe status --porcelain
if ($status) {
    & $gitExe commit -m "$commitMessage"
    Write-Output "Committed changes: $commitMessage"
} else {
    Write-Output "No changes to commit, proceeding to push..."
}

# Push to main
& $gitExe push origin main
Write-Output "Pushed to GitHub main successfully! Vercel & Render auto-deploy triggered."
