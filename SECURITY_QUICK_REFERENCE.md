# 🔐 Security Vulnerabilities - Quick Reference Card

Print this or pin to your desk for quick lookup during fixes.

---

## 🔴 CRITICAL - FIX TODAY

### #1 XSS in Browser Extension
```
File: public/chrome-extension/popup.js (line 26)
      public/firefox-extension/popup.js (line 26)
Problem: innerHTML + template literals = XSS
Fix: Replace with DOM methods (textContent, createElement)
Risk: Token theft, malware injection
Time: 1-2 hours
```

**One-Line Fix:**
```javascript
// DON'T: container.innerHTML = `<div>${l.text}</div>`;
// DO:    div.textContent = l.text; container.appendChild(div);
```

---

## 🟡 HIGH - FIX THIS WEEK

### #2 Weak Password Validation
```
File: src/pages/SettingsPage.tsx (line 71)
Problem: Only checks 6+ characters
Fix: Require 12+ chars + uppercase + lowercase + digit + symbol
Time: 1 hour
Priority: HIGH - affects account security
```

**Minimum valid password:** `Abcd1234!@#`

### #3 localStorage Cache Risk
```
File: src/components/ScreenshotUpload.tsx (line 125-201)
Problem: Stores unencrypted data in localStorage
Fix: Remove all localStorage usage for screenshot cache
Time: 1-2 hours
Risk: Cache poisoning attacks
```

### #4 Missing Input Validation
```
File: src/components/RoleManagementPanel.tsx
Problem: No validation on text inputs
Fix: Add length checks, character validation before submit
Time: 2-3 hours
Risk: Injection attacks
```

**Example validation:**
```typescript
if (input.length < 3 || input.length > 50) return "Invalid length";
if (!/^[a-zA-Z0-9_-\s]+$/.test(input.trim())) return "Invalid chars";
```

---

## 🟠 MEDIUM - FIX NEXT WEEK

### #5 Stale Authorization State
```
File: src/contexts/AuthContext.tsx (line 82-95)
Problem: Admin role checked only at login
Fix: Refresh roles every 5 minutes + re-verify before sensitive actions
Time: 2-3 hours
Risk: Privilege escalation if role revoked mid-session
```

### #6 Avatar Upload - File Type Bypass
```
File: src/components/AvatarUpload.tsx (line 28-31)
Problem: Only checks MIME type (spoofable)
Fix: Verify magic number (file signature) before upload
Time: 1-2 hours
Files allowed: JPEG (FF D8), PNG (89 50 4E 47), WebP
Max size: 512 KB
```

### #7 Screenshot Upload - File Validation Gap
```
File: src/components/ScreenshotUpload.tsx (line 85-86)
Problem: Similar to avatar but allows 3 files with loose validation
Fix: Add comprehensive file type/size checking + magic numbers
Time: 1-2 hours
Max: 10 MB per file, max 3 files
```

### #8 Console Logging - Info Disclosure
```
File: public/chrome-extension/content.js (lines 75, 329, 369)
      public/firefox-extension/content.js (same lines)
Problem: Logs sensitive info (tokens, user IDs, match data)
Fix: Remove or guard behind DEBUG flag
Time: 30 minutes
Risk: LOW - but info disclosure in dev tools
```

---

## 📊 Impact Severity Grid

```
CRITICAL    XSS (Token Theft)
├─ Token exposed via injection
├─ Extension compromised
└─ Account takeover possible

HIGH        Password + Cache + Input
├─ Credential brute force
├─ Data manipulation
└─ Injection attacks

MEDIUM      Auth + File Uploads
├─ Role escalation
├─ Malicious file execution
└─ Race conditions

LOW         Console Logs
├─ Info disclosure
└─ Debugging difficulty
```

---

## ✅ Testing Checklist

### XSS Test
```
1. Add log with: <img src=x onerror="alert('xss')">
2. Verify: No alert appears, displays as text
3. Check: Browser console clean, no errors
```

### Password Test
```
1. Try: "abc123" → Should REJECT ✓
2. Try: "Abc123!@#456" → Should ACCEPT ✓
3. Try: "abc123456789" → Should REJECT (no uppercase) ✓
```

### File Upload Test
```
1. Rename: shell.exe → shell.jpg
2. Upload as avatar
3. Verify: REJECTED at magic number check ✓
```

### Authorization Test
```
1. Login as admin
2. Revoke role in backend
3. Try admin action
4. Verify: DENIED (backend RLS check) ✓
```

---

## 🚀 Implementation Priority

```
Day 1:    Fix #1 (XSS) ..................... CRITICAL
Day 2-5:  Fix #2-4 (High priority) ........ THIS WEEK
Day 6-14: Fix #5-8 (Medium/Low) ........... NEXT WEEK
```

---

## 📋 Code Review Checklist

When reviewing fixes:

- [ ] No `innerHTML` with dynamic content
- [ ] `textContent` used for user input
- [ ] File uploads verify magic numbers
- [ ] Input validated (length, chars, type)
- [ ] No sensitive data in localStorage
- [ ] Passwords enforce 12+ chars + complexity
- [ ] Authorization re-checked per action
- [ ] No debug logging in production
- [ ] Error messages don't leak info
- [ ] Tests pass + new tests added

---

## 🔗 Reference Links

**In This Repository:**
- Full audit: [SECURITY_AUDIT_SECOND_PASS.md](SECURITY_AUDIT_SECOND_PASS.md)
- Code fixes: [SECURITY_FIXES_IMPLEMENTATION.md](SECURITY_FIXES_IMPLEMENTATION.md)
- Risk matrix: [SECURITY_AUDIT_SUMMARY.md](SECURITY_AUDIT_SUMMARY.md)

**External Resources:**
- OWASP XSS Prevention: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
- File Upload Security: https://owasp.org/www-community/vulnerabilities/Unrestricted_File_Upload
- Password Policy: https://pages.nist.gov/800-63-3/sp800-63b.html

---

## 📞 Quick Support

**Question:** Why is XSS critical?
**Answer:** Extension runs with elevated privileges. Attacker could steal Autodarts tokens, auto-submit false results, or inject malware.

**Question:** Can I fix password validation alone?
**Answer:** Yes, but coordinate with backend - backend must also enforce policy.

**Question:** Do I need to rotate Supabase keys?
**Answer:** .env was already in git history. If deployed, rotate keys NOW in Supabase dashboard.

**Question:** What about CSRF protection?
**Answer:** Supabase handles this. Verify in backend (RLS policies on all tables).

---

**Last Updated:** March 15, 2026  
**Status:** Ready for Implementation  
**Next Review:** After fixes deployed (March 22-29)

