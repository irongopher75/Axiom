import React, { useEffect } from 'react';

const LogoReveal = ({ onComplete }) => {
    const [isFading, setIsFading] = React.useState(false);

    useEffect(() => {
        // Start fading out slightly before completion
        const fadeTimer = setTimeout(() => setIsFading(true), 2550);
        const completeTimer = setTimeout(() => {
            onComplete();
        }, 3000);
        return () => {
            clearTimeout(fadeTimer);
            clearTimeout(completeTimer);
        };
    }, [onComplete]);

    const axiomText = "AXIOM";
    const terminalText = "INTELLIGENCE TERMINAL";

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: '#000',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            fontFamily: 'IBM Plex Mono, monospace',
            opacity: isFading ? 0 : 1,
            transition: 'opacity 0.45s ease-in-out',
            pointerEvents: 'none'
        }}>
            <style>{`
                @keyframes line-expand {
                    0% { transform: scaleX(0); }
                    100% { transform: scaleX(1); }
                }
                @keyframes line-retract {
                    0% { transform: scaleX(1); }
                    100% { transform: scaleX(0); }
                }
                @keyframes letter-fade {
                    0% { opacity: 0; filter: blur(2px); }
                    100% { opacity: 1; filter: blur(0); }
                }
                
                .axiom-line {
                    width: 120px;
                    height: 1px;
                    background: #FF6600;
                    transform-origin: center;
                    animation: 
                        line-expand 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards,
                        line-retract 0.4s cubic-bezier(0.16, 1, 0.3, 1) 2.2s forwards;
                    position: relative;
                }

                .axiom-text {
                    color: #FF6600;
                    font-size: 48px;
                    letter-spacing: 0.3em;
                    margin-bottom: 24px;
                    display: flex;
                }

                .terminal-text {
                    color: #444444;
                    font-size: 11px;
                    letter-spacing: 0.2em;
                    margin-top: 24px;
                    display: flex;
                }

                .char {
                    opacity: 0;
                    animation: letter-fade 0.3s ease forwards;
                }
            `}</style>

            <div className="axiom-text">
                {axiomText.split('').map((char, i) => (
                    <span
                        key={i}
                        className="char"
                        style={{ animationDelay: `${0.9 + (i * 0.08)}s` }}
                    >
                        {char}
                    </span>
                ))}
            </div>

            <div className="axiom-line" />

            <div className="terminal-text">
                {terminalText.split('').map((char, i) => (
                    <span
                        key={i}
                        className="char"
                        style={{ animationDelay: `${1.4 + (i * 0.04)}s` }}
                    >
                        {char === ' ' ? '\u00A0' : char}
                    </span>
                ))}
            </div>

            {/* Central Spark */}
            <div style={{
                position: 'absolute',
                width: '1px',
                height: '1px',
                background: '#FF6600',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                opacity: 0,
                animation: 'spark 0.1s 0.2s forwards, spark-off 0.1s 2.6s forwards'
            }} />

            <style>{`
                @keyframes spark {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes spark-off {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
            `}</style>
        </div>
    );
};

export default LogoReveal;
