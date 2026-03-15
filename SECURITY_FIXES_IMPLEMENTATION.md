# Security Fix Action Items - Implementation Guide

**Generated:** March 15, 2026  
**Status:** Ready for implementation  

---

## CRITICAL FIX #1: XSS in Browser Extension

### File: `public/chrome-extension/popup.js` (Lines 24-29)

**Current (UNSAFE):**
```javascript
function renderLogs() {
  const container = document.getElementById("logsContainer");
  if (!container) return;
  if (logs.length === 0) { container.innerHTML = '<div class="empty">Brak logów</div>'; return; }
  container.innerHTML = logs.map((l) =>
    `<div class="log-entry ${l.type}">[${l.time}] ${l.text}</div>`
  ).join("");
}
```

**Fixed (SAFE):**
```javascript
function renderLogs() {
  const container = document.getElementById("logsContainer");
  if (!container) return;
  if (logs.length === 0) { 
    container.innerHTML = '';
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'empty';
    emptyDiv.textContent = 'Brak logów';
    container.appendChild(emptyDiv);
    return; 
  }
  container.innerHTML = '';
  logs.forEach((l) => {
    const div = document.createElement('div');
    div.className = `log-entry ${l.type}`;
    // Use textContent to prevent XSS - it automatically escapes HTML
    div.textContent = `[${l.time}] ${l.text}`;
    container.appendChild(div);
  });
}
```

**Also apply to:** `public/firefox-extension/popup.js` (same fix)

**Verification:**
```bash
# Test with malicious input
# In browser console, call:
addLog("<img src=x onerror=\"alert('XSS')\">", "error");
# Should display as text, not execute alert
```

---

## HIGH FIX #1: Weak Password in SettingsPage

### File: `src/pages/SettingsPage.tsx` (Around line 71)

**Current (WEAK):**
```typescript
const handleChangePassword = async (e: React.FormEvent) => {
  e.preventDefault();
  if (newPassword !== confirmPassword) {
    toast({ title: "Błąd", description: "Hasła nie są identyczne.", variant: "destructive" });
    return;
  }
  if (newPassword.length < 6) {
    toast({ title: "Błąd", description: "Hasło musi mieć minimum 6 znaków.", variant: "destructive" });
    return;
  }
  setSubmitting(true);
  const { error } = await updatePassword(newPassword);
  // ... rest
};
```

**Fixed (STRONG):**
```typescript
// Add this validation function at component level
const validatePassword = (pwd: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  if (pwd.length < 12) errors.push("Minimum 12 znaków");
  if (!/[A-Z]/.test(pwd)) errors.push("Minimum 1 wielka litera");
  if (!/[a-z]/.test(pwd)) errors.push("Minimum 1 mała litera");
  if (!/[0-9]/.test(pwd)) errors.push("Minimum 1 cyfra");
  if (!/[!@#$%^&*-_=+]/.test(pwd)) errors.push("Minimum 1 znak specjalny");
  return { valid: errors.length === 0, errors };
};

const handleChangePassword = async (e: React.FormEvent) => {
  e.preventDefault();
  if (newPassword !== confirmPassword) {
    toast({ title: "Błąd", description: "Hasła nie są identyczne.", variant: "destructive" });
    return;
  }
  
  const { valid, errors } = validatePassword(newPassword);
  if (!valid) {
    toast({ 
      title: "Hasło zbyt słabe", 
      description: "Wymagania: " + errors.join(", "),
      variant: "destructive"
    });
    return;
  }
  
  setSubmitting(true);
  const { error } = await updatePassword(newPassword);
  setSubmitting(false);
  if (error) {
    toast({ title: "Błąd", description: error, variant: "destructive" });
  } else {
    toast({ title: "Hasło zmienione!", description: "Twoje nowe hasło zostało zapisane." });
    setNewPassword("");
    setConfirmPassword("");
  }
};
```

**Update placeholder text in JSX:**
```typescript
<Input 
  type="password" 
  value={newPassword} 
  onChange={(e) => setNewPassword(e.target.value)} 
  placeholder="Min. 12 znaków, wielkie, małe, cyfra, symbol" 
  className="bg-muted/30 border-border" 
  required 
/>
```

---

## HIGH FIX #2: Remove localStorage Cache from ScreenshotUpload

### File: `src/components/ScreenshotUpload.tsx` (Lines 120-210)

**Current (UNSAFE):**
```typescript
const analyzeScreenshots = async () => {
  if (uploadedUrls.length === 0) return;

  const cacheKey = `screenshot-stats:${btoa(JSON.stringify(uploadedUrls))}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const cachedData = JSON.parse(cached);
      if (cachedData?.data) {
        toast({ title: "📥 Użyto ostatnich wyników", description: "Statystyki pobrane z pamięci podręcznej." });
        onStatsExtracted({ ...cachedData.data, screenshot_urls: uploadedUrls });
        return;
      }
    }
  } catch (e) {
    // ignore cache errors
  }

  setAnalyzing(true);
  try {
    const requestBody: Record<string, any> = { screenshot_urls: uploadedUrls };
    if (matchContext) {
      requestBody.match_context = matchContext;
    }
    const { data, error } = await supabase.functions.invoke("analyze-match-screenshot", {
      body: requestBody,
    });

    if (error) {
      // Handle error...
    } else {
      onStatsExtracted({ ...data, screenshot_urls: uploadedUrls });
      
      // REMOVE THIS:
      // localStorage.setItem(cacheKey, JSON.stringify({ data: stats, createdAt: Date.now() }));
    }
  } finally {
    setAnalyzing(false);
  }
};
```

**Fixed (NO localStorage):**
```typescript
const analyzeScreenshots = async () => {
  if (uploadedUrls.length === 0) return;

  setAnalyzing(true);
  try {
    const requestBody: Record<string, any> = { screenshot_urls: uploadedUrls };
    if (matchContext) {
      requestBody.match_context = matchContext;
    }
    const { data, error } = await supabase.functions.invoke("analyze-match-screenshot", {
      body: requestBody,
    });

    if (error) {
      const errorMsg = error.message || "Nieznany błąd";
      if (errorMsg.includes("429") || errorMsg.includes("rate limit")) {
        toast({ 
          title: "Zbyt dużo żądań", 
          description: "Czekaj 1 minutę przed następną analizą", 
          variant: "destructive" 
        });
      } else if (errorMsg.includes("402") || errorMsg.includes("payment")) {
        toast({ 
          title: "Limit analizy", 
          description: "Limit bezpłatnych analiz wyczerpany", 
          variant: "destructive" 
        });
      } else {
        toast({ 
          title: "Błąd analizy", 
          description: errorMsg, 
          variant: "destructive" 
        });
      }
      return;
    }

    if (data) {
      onStatsExtracted({ ...data, screenshot_urls: uploadedUrls });
      toast({ 
        title: "✅ Analiza ukończona", 
        description: "Statystyki zostały wyodrębnione z zrzutu ekranu" 
      });
    }
  } catch (e) {
    console.error("Screenshot analysis error:", e);
    toast({ 
      title: "Błąd", 
      description: "Nie udało się przeanalizować zrzutu ekranu", 
      variant: "destructive" 
    });
  } finally {
    setAnalyzing(false);
  }
};
```

---

## HIGH FIX #3: Input Validation in RoleManagementPanel

### File: `src/components/RoleManagementPanel.tsx` (Around line 200-250)

**Add validation functions:**
```typescript
const validateRoleInput = (
  name: string,
  description: string
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!name || name.trim().length === 0) {
    errors.push("Nazwa roli jest wymagana");
  } else if (name.trim().length < 3) {
    errors.push("Nazwa musi mieć minimum 3 znaki");
  } else if (name.length > 50) {
    errors.push("Nazwa nie może być dłuższa niż 50 znaków");
  } else if (!/^[a-zA-Z0-9_\-\s]+$/.test(name.trim())) {
    errors.push("Nazwa może zawierać tylko litery, cyfry, podkreślenie i myślnik");
  }

  if (description && description.length > 500) {
    errors.push("Opis nie może być dłuższy niż 500 znaków");
  }

  return { valid: errors.length === 0, errors };
};

const validatePermissionKey = (key: string): boolean => {
  if (!key || typeof key !== "string") return false;
  return /^[a-z_]+$/.test(key) && key.length <= 100;
};

// In handleCreateRole or save role function:
const handleSaveRole = async () => {
  const { valid, errors } = validateRoleInput(roleName, roleDescription);
  
  if (!valid) {
    toast({
      title: "Błąd walidacji",
      description: errors.join("; "),
      variant: "destructive"
    });
    return;
  }

  // Sanitize inputs
  const cleanName = roleName.trim();
  const cleanDesc = (roleDescription || "").trim();

  // Proceed with safe data
  // ... existing logic
};
```

**Update form inputs to include validation:**
```typescript
<div className="space-y-2">
  <Label>Nazwa roli *</Label>
  <Input
    value={roleName}
    onChange={(e) => {
      const val = e.target.value.slice(0, 50);
      setRoleName(val);
    }}
    placeholder="np. Moderator, Zaawansowany"
    maxLength={50}
    className="bg-muted/30 border-border"
    required
  />
  <p className="text-[10px] text-muted-foreground">Max 50 znaków. Tylko litery, cyfry, podkreślenie, myślnik.</p>
</div>

<div className="space-y-2">
  <Label>Opis roli</Label>
  <textarea
    value={roleDescription}
    onChange={(e) => {
      const val = e.target.value.slice(0, 500);
      setRoleDescription(val);
    }}
    placeholder="Krótki opis uprawnień..."
    maxLength={500}
    className="w-full p-2 bg-muted/30 border border-border rounded text-sm"
    rows={3}
  />
  <p className="text-[10px] text-muted-foreground">{roleDescription.length}/500</p>
</div>
```

---

## MEDIUM FIX #1: Add Role Refresh Logic to AuthContext

### File: `src/contexts/AuthContext.tsx` (Add after useEffect hook ~line 120)

```typescript
// Add periodic role refresh effect
useEffect(() => {
  if (!user) return;

  // Refresh roles every 5 minutes
  const refreshInterval = setInterval(() => {
    if (user) {
      checkRoles(user.id).catch(err => {
        console.error("Role refresh failed:", err);
      });
    }
  }, 5 * 60 * 1000); // 5 minutes

  return () => clearInterval(refreshInterval);
}, [user, checkRoles]);
```

**Also add helper function for per-action authorization:**
```typescript
// Add new function to interface/context
const verifyAdminBeforeAction = useCallback(async (): Promise<boolean> => {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: user?.id || "",
    _role: "admin"
  });
  return !error && Boolean(data);
}, [user, supabase]);
```

**Export from hook:**
```typescript
const value = {
  user,
  profile,
  isAdmin,
  isModerator,
  loading,
  login,
  register,
  logout,
  resetPassword,
  updatePassword,
  verifyAdminBeforeAction, // NEW
  loading,
};
```

---

## MEDIUM FIX #2: File Type Validation in AvatarUpload

### File: `src/components/AvatarUpload.tsx` (Replace handleUpload)

```typescript
const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file || !user) return;

  // Validate MIME type
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
  if (!ALLOWED_TYPES.includes(file.type)) {
    toast({ 
      title: "Błąd", 
      description: "Obsługiwane formaty: JPEG, PNG, WebP", 
      variant: "destructive" 
    });
    return;
  }

  // Validate file size
  if (file.size > 512 * 1024) {
    toast({ 
      title: "Błąd", 
      description: "Maksymalny rozmiar avatara to 512 KB.", 
      variant: "destructive" 
    });
    return;
  }

  // Verify magic number (file signature)
  try {
    const buffer = await file.slice(0, 4).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    const isJpeg = bytes[0] === 0xFF && bytes[1] === 0xD8;
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
    
    // WebP detection requires more bytes, but we'll trust MIME type for WebP
    const isWebP = file.type === "image/webp";
    
    if (!isJpeg && !isPng && !isWebP) {
      toast({ 
        title: "Błąd", 
        description: "Plik nie jest prawidłowym obrazem", 
        variant: "destructive" 
      });
      return;
    }
  } catch (err) {
    toast({ 
      title: "Błąd", 
      description: "Nie udało się walidować pliku", 
      variant: "destructive" 
    });
    return;
  }

  setUploading(true);

  // Determine extension based on MIME type
  const ext = 
    file.type === "image/jpeg" ? "jpg" :
    file.type === "image/png" ? "png" :
    file.type === "image/webp" ? "webp" :
    "jpg";
  
  const path = `${user.id}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { 
      upsert: true,
      contentType: file.type
    });

  if (uploadError) {
    toast({ title: "Błąd uploadu", description: uploadError.message, variant: "destructive" });
    setUploading(false);
    return;
  }

  const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
  const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

  // Update player record
  await supabase.from("players").update({ avatar_url: urlWithCacheBust }).eq("id", playerId);

  setPreviewUrl(urlWithCacheBust);
  onUploaded(urlWithCacheBust);
  setUploading(false);
  toast({ title: "Zdjęcie zapisane!", description: "Twój avatar został zaktualizowany." });
};
```

---

## MEDIUM FIX #3: File Validation in ScreenshotUpload

### File: `src/components/ScreenshotUpload.tsx` (Update handleFiles)

```typescript
const handleFiles = async (files: FileList | null) => {
  if (!files || files.length === 0) return;
  if (uploadedUrls.length + files.length > 3) {
    toast({ title: "Limit", description: "Maksymalnie 3 zrzuty ekranu.", variant: "destructive" });
    return;
  }

  setUploading(true);
  const newUrls: string[] = [];
  const newPreviews: string[] = [];

  for (const file of Array.from(files)) {
    try {
      // Validate MIME type
      const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast({ 
          title: "Błąd", 
          description: `Nieobsługiwany typ: ${file.type}. Używaj JPEG, PNG lub WebP.`, 
          variant: "destructive" 
        });
        continue;
      }

      // Validate file size (10MB max per screenshot)
      if (file.size > 10 * 1024 * 1024) {
        toast({ 
          title: "Błąd", 
          description: `Plik zbyt duży - max 10MB (${(file.size / 1024 / 1024).toFixed(1)}MB)`, 
          variant: "destructive" 
        });
        continue;
      }

      // Verify magic number
      const buffer = await file.slice(0, 4).arrayBuffer();
      const bytes = new Uint8Array(buffer);
      
      const isJpeg = bytes[0] === 0xFF && bytes[1] === 0xD8;
      const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
      const isWebP = file.type === "image/webp";
      
      if (!isJpeg && !isPng && !isWebP) {
        toast({ 
          title: "Błąd", 
          description: "Plik nie jest prawidłowym obrazem", 
          variant: "destructive" 
        });
        continue;
      }

      // Local preview
      const reader = new FileReader();
      const previewPromise = new Promise<string>((resolve) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
      newPreviews.push(await previewPromise);

      // Compress and upload
      const compressed = await compressImage(file);
      const path = `${matchId || "temp"}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;

      const { error } = await supabase.storage
        .from("match-screenshots")
        .upload(path, compressed, { contentType: "image/jpeg" });

      if (error) {
        console.error("Upload error:", error);
        toast({ 
          title: "Błąd uploadu", 
          description: error.message, 
          variant: "destructive" 
        });
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("match-screenshots")
        .getPublicUrl(path);

      newUrls.push(urlData.publicUrl);
    } catch (err) {
      console.error("File processing error:", err);
      toast({ 
        title: "Błąd przetwarzania", 
        description: "Nie udało się przetworzyć pliku", 
        variant: "destructive" 
      });
    }
  }

  setUploadedUrls((prev) => [...prev, ...newUrls]);
  setPreviews((prev) => [...prev, ...newPreviews]);
  setUploading(false);

  if (newUrls.length > 0) {
    toast({ title: "📸 Przesłano!", description: `${newUrls.length} zrzut(y) ekranu.` });
  }
};
```

---

## LOW FIX: Remove Sensitive Console Logs from Extension

### File: `public/chrome-extension/content.js` (Multiple locations)

**Location 1 - Line 75:**
```javascript
// BEFORE:
console.log(`[eDART] ✅ Token captured (${source}), len=${token.length}`);

// AFTER:
if (process.env.DEBUG === "true") {
  console.log(`[eDART] ✅ Token captured (${source})`);
}
```

**Location 2 - Line 329:**
```javascript
// BEFORE:
console.log("[eDART] User ID from bridge:", event.data.userId);

// AFTER:
if (process.env.DEBUG === "true") {
  console.log("[eDART] User ID from bridge captured");
}
```

**Location 3 - Line 369:**
```javascript
// BEFORE:
console.log("[eDART] Captured finished match:", matchId, payload.player1_name, "vs", payload.player2_name);

// AFTER:
if (process.env.DEBUG === "true") {
  console.log("[eDART] Captured finished match");
}
```

**Also verify:** Same changes needed in `public/firefox-extension/content.js`

---

## Testing Checklist

- [ ] XSS test: Create league with name `<img src=x onerror="alert('xss')">`, verify no alert appears
- [ ] Password test: Try setting 6-char password "abc123", should be rejected
- [ ] File upload test: Rename shell.exe to shell.jpg, attempt avatar upload, should be rejected
- [ ] Role test: Login as admin, revoke role in DB, attempt admin action, should fail
- [ ] Cache test: Upload screenshot, check localStorage, verify no "screenshot-stats:" keys

---

## Implementation Order

1. **Today:** Fix XSS (1-2h)
2. **Tomorrow:** Settings password, input validation (2-3h)
3. **This Week:** File upload validation, remove cache (3-4h)
4. **Next Week:** Role refresh, console logs (2-3h)

**Estimated Total:** 8-12 hours of development work

