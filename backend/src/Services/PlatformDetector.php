<?php
// =============================================================================
// src/Services/PlatformDetector.php
// =============================================================================
// PHP equivalent of the frontend's platformDetector.ts.
// We validate the platform on the BACKEND too because we can never trust input
// from the frontend — a user could send a raw HTTP request to our API bypassing
// all frontend validation.
// =============================================================================

declare(strict_types=1);

namespace MediaVault\Services;


class PlatformDetector
{
    // Patterns for each supported platform.
    // "~pattern~i" is PHP regex syntax. The "i" flag makes it case-insensitive.
    private const PATTERNS = [
        'facebook'  => ['~facebook\.com~i', '~fb\.com~i', '~fb\.watch~i'],
        'twitter'   => ['~twitter\.com~i',  '~x\.com~i'],
        'instagram' => ['~instagram\.com~i'],
        'tiktok'    => ['~tiktok\.com~i',   '~vm\.tiktok\.com~i'],
        'snapchat'  => ['~snapchat\.com~i', '~t\.snapchat\.com~i'],
    ];


    // "detect" is a static method — called as PlatformDetector::detect($url).
    // Static means you do not need to create an object: "new PlatformDetector()".
    public static function detect(string $url): string
    {
        foreach (self::PATTERNS as $platform => $patterns) {
            foreach ($patterns as $pattern) {
                // "preg_match()" returns 1 if the pattern matches, 0 if not.
                if (preg_match($pattern, $url)) {
                    return $platform;
                }
            }
        }
        return 'unknown';
    }


    // Returns all supported platform names.
    public static function getSupportedPlatforms(): array
    {
        return array_keys(self::PATTERNS);
    }
}
