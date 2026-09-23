# Whimlet · Supabase email templates (paste-ready)

Setting: **Supabase Dashboard → Authentication → Email Templates →** edit each of the two templates below.

These are "cute girly pastel," and every styling/asset is INLINE + data-only —
email clients block external CSS/images/webfonts, so there are no
`<link>`/`<img>`/custom-font dependencies. Only Supabase's `{{ … }}` variables
are used (`{{ .Token }}` is 6-digit-only, WILL BREAK as a URL with
"Confirm email" ON — so we use `{{ .ConfirmationURL }}` everywhere).

Failsafe: every template ships a clickable button PLUS the raw
`{{ .ConfirmationURL }}` as plain text to paste PLUS the 6-digit
`{{ .Token }}` fallback. All three are supported by the site: `/signin` now
has a "Got an email code? Use it instead" entry that verifies the code for
both sign-up confirmations and magic links (mail scanners prefetch and
consume button links, so the visible code is the escape hatch).

---

## 1) "Confirm signup" template (sent on create-account with email verification)

```html
<div style="margin:0;padding:24px;background:#fff6f8;font-family:Arial,Helvetica,sans-serif;color:#4a3238">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #f3d7e0;border-radius:24px;padding:32px 28px;text-align:center">
    <div style="font-size:40px;line-height:1">🧶</div>
    <h1 style="margin:14px 0 6px;font-size:24px;color:#b8456f">Whimlet</h1>
    <p style="margin:0 0 6px;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#e07a9a">confirm your email</p>
    <p style="margin:14px 0 26px;font-size:15px;line-height:1.55;color:#7e6068">
      You're one click from your little corner of Whimlet.<br />Just confirm this address to finish setting up your account.
    </p>
    <a href="{{ .ConfirmationURL }}"
       style="display:inline-block;background:#f07c8c;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;padding:14px 34px;border-radius:999px">
      💗 Confirm my email
    </a>
    <p style="margin:22px 0 0;font-size:12px;line-height:1.6;color:#a98d95">
      Button not working? Paste this into your browser:<br />
      <a href="{{ .ConfirmationURL }}" style="color:#b8456f;word-break:break-all">{{ .ConfirmationURL }}</a>
    </p>
    <p style="margin:18px 0 0;padding-top:16px;border-top:1px dashed #f3d7e0;font-size:12px;color:#a98d95">
      Prefer a code? Enter <strong style="color:#4a3238">{{ .Token }}</strong> on the sign-in page.
    </p>
    <p style="margin:6px 0 0;font-size:11px;color:#c2aab0">If you didn't make a Whimlet account, you can ignore this email.</p>
  </div>
</div>
```

---

## 2) "Magic link" template (sent when they choose the magic-link / OTP path)

```html
<div style="margin:0;padding:24px;background:#fff6f8;font-family:Arial,Helvetica,sans-serif;color:#4a3238">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #f3d7e0;border-radius:24px;padding:32px 28px;text-align:center">
    <div style="font-size:40px;line-height:1">🪡</div>
    <h1 style="margin:14px 0 6px;font-size:24px;color:#b8456f">Whimlet</h1>
    <p style="margin:0 0 6px;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#e07a9a">your magic link</p>
    <p style="margin:14px 0 26px;font-size:15px;line-height:1.55;color:#7e6068">
      Tap the button and you're in — one stitch at a time.
    </p>
    <a href="{{ .ConfirmationURL }}"
       style="display:inline-block;background:#f07c8c;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;padding:14px 34px;border-radius:999px">
      💗 Sign in to Whimlet
    </a>
    <p style="margin:22px 0 0;font-size:12px;line-height:1.6;color:#a98d95">
      Or paste this into your browser:<br />
      <a href="{{ .ConfirmationURL }}" style="color:#b8456f;word-break:break-all">{{ .ConfirmationURL }}</a>
    </p>
    <p style="margin:18px 0 0;padding-top:16px;border-top:1px dashed #f3d7e0;font-size:12px;color:#a98d95">
      Prefer a code? Enter <strong style="color:#4a3238">{{ .Token }}</strong>.
    </p>
    <p style="margin:6px 0 0;font-size:11px;color:#c2aab0">Didn't ask for this? You can safely ignore it.</p>
  </div>
</div>
```

---

## Notes

- Keep **both** `{{ .ConfirmationURL }}` (the clickable link) **and**
  `{{ .Token }}` (the 6-digit fallback) — the code is the escape hatch for
  mail scanners that prefetch links, and `/signin` now accepts it.
- `{{ .Token }}` is a **6-digit number**. Do NOT use it as a URL / inside
  `href` — it breaks email confirmation.
- Google Sign-In doesn't go through these templates at all (Google handles
  its own screen), so this only affects email sign-up + magic link.
