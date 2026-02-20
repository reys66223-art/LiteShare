'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';
import { ReactNode, useEffect, useState } from 'react';

function ClerkThemeProvider({ children }: { children: ReactNode }) {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDark = mounted && resolvedTheme === 'dark';

    return (
        <ClerkProvider
            appearance={{
                baseTheme: isDark ? dark : undefined,
                variables: {
                    colorPrimary: isDark ? 'oklch(0.922 0 0)' : 'oklch(0.205 0 0)',
                    colorBackground: isDark ? 'oklch(0.205 0 0)' : 'oklch(1 0 0)',
                    colorForeground: isDark ? 'oklch(0.985 0 0)' : 'oklch(0.145 0 0)',
                    colorText: isDark ? 'oklch(0.985 0 0)' : 'oklch(0.145 0 0)',
                    colorInputBackground: isDark ? 'oklch(0.145 0 0)' : 'oklch(1 0 0)',
                    colorInputText: isDark ? 'oklch(0.985 0 0)' : 'oklch(0.145 0 0)',
                    colorTextSecondary: isDark ? 'oklch(0.708 0 0)' : 'oklch(0.556 0 0)',
                    colorBorder: isDark ? 'oklch(1 0 0 / 10%)' : 'oklch(0.922 0 0)',
                    borderRadius: '0.5rem',
                },
                elements: {
                    card: 'shadow-xl border border-border bg-card',
                    headerTitle: 'text-foreground font-bold text-2xl',
                    headerSubtitle: 'text-muted-foreground',
                    formFieldLabel: 'text-foreground font-medium',
                    formFieldInput: 'bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/20 transition-all',
                    socialButtonsBlockButton: 'border border-border hover:bg-muted transition-all',
                    footerActionLink: 'text-primary hover:text-primary/80 font-semibold',
                    userButtonPopoverCard: 'shadow-xl border border-border bg-card',
                    // Hiding branding precisely as requested
                    internal_branding: 'hidden',
                    footer: 'hidden',
                }
            }}
        >
            {children}
        </ClerkProvider>
    );
}

export function Providers({ children }: { children: ReactNode }) {
    return (
        <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
            <ClerkThemeProvider>{children}</ClerkThemeProvider>
        </NextThemesProvider>
    );
}
