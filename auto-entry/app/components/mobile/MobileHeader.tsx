interface MobileHeaderProps {
    title: string;
    subtitle: string;
}

export function MobileHeader({ title, subtitle }: MobileHeaderProps) {
    return (
        <header className="mobile-header">
            <h1 className="mobile-header__title">{title}</h1>
            <p className="mobile-header__subtitle">{subtitle}</p>
        </header>
    );
}
