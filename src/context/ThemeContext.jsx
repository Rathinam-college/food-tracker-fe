import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => {
        // Check localStorage or default to 'dark'
        return localStorage.getItem('ft_theme') || 'dark';
    });

    useEffect(() => {
        // Apply the theme class to the body element
        const body = document.body;
        body.classList.remove('light-theme', 'sky-theme', 'google-theme');
        if (theme === 'light') {
            body.classList.add('light-theme');
        } else if (theme === 'sky') {
            body.classList.add('sky-theme');
        } else if (theme === 'google') {
            body.classList.add('google-theme');
        }
        // Persist to localStorage
        localStorage.setItem('ft_theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => {
            if (prevTheme === 'dark') return 'light';
            if (prevTheme === 'light') return 'sky';
            if (prevTheme === 'sky') return 'google';
            return 'dark';
        });
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
