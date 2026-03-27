import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import useTerminalStore from '../../store/useTerminalStore';

const LandingPage = () => {
    const navigate = useNavigate();
    const { vessels, aircraft, intelFeed, connect, isLive } = useTerminalStore();

    const heroRef = useRef(null);
    const mapSectionRef = useRef(null);
    const signalSectionRef = useRef(null);
    const pricingSectionRef = useRef(null);

    const scrollToSection = (ref) => {
        ref.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Connect to streams for real stats
    useEffect(() => {
        if (!isLive) connect();
    }, [isLive, connect]);

    // Current counts from terminal store - STRICTLY REAL DATA
    const vesselCount = vessels.length;
    const flightCount = aircraft.length;
    const signalCount = intelFeed.length;

    return (
        <div style={{ background: '#000', color: '#E8E8E8', fontFamily: 'IBM Plex Sans Condensed, sans-serif' }}>
            <style>{`
                @keyframes grid-drift {
                    0% { background-position: 0 0; }
                    100% { background-position: 40px 40px; }
                }
                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }
                .grid-bg {
                    position: fixed;
                    inset: 0;
                    background-image: linear-gradient(#0D0D0D 1px, transparent 1px), linear-gradient(90deg, #0D0D0D 1px, transparent 1px);
                    background-size: 40px 40px;
                    animation: grid-drift 20s linear infinite;
                    pointer-events: none;
                    z-index: 0;
                }
                .nav-item { color: #666; font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.1em; text-decoration: none; transition: color 0.1s; cursor: pointer; background: none; border: none; padding: 0; }
                .nav-item:hover { color: #FF6600; }
                .btn-access { 
                    border: 1px solid #FF6600; color: #FF6600; padding: 11px 22px; 
                    font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: 0.15em; 
                    background: transparent; cursor: pointer; transition: all 0.12s linear;
                }
                .btn-access:hover { background: #FF6600; color: #000; }
            `}</style>

            <div className="grid-bg" />

            {/* Header */}
            <header style={{ position: 'fixed', top: 0, left: 0, right: 0, padding: '24px 8%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
                <div style={{ color: '#FF6600', fontFamily: 'IBM Plex Mono', fontSize: '13px', display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => scrollToSection(heroRef)}>
                    AXIOM <span style={{ marginLeft: '4px', animation: 'blink 1s step-end infinite' }}>_</span>
                </div>
                <nav style={{ display: 'flex', gap: '40px', alignItems: 'center' }}>
                    <button onClick={() => scrollToSection(mapSectionRef)} className="nav-item">TERMINAL</button>
                    <button onClick={() => scrollToSection(signalSectionRef)} className="nav-item">INTELLIGENCE</button>
                    <button onClick={() => scrollToSection(pricingSectionRef)} className="nav-item">PRICING</button>
                </nav>
            </header>

            {/* Hero Section */}
            <section ref={heroRef} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 8%', position: 'relative', zIndex: 5 }}>
                <h1 style={{ fontFamily: 'IBM Plex Mono', fontSize: '7vw', lineHeight: '0.9', margin: '0 0 32px 0', letterSpacing: '-0.02em', textAlign: 'left' }}>
                    THE MARKET HAS<br />NO OPINION OF<br />YOUR FEELINGS.
                </h1>
                <p style={{ color: '#555', fontSize: '15px', maxWidth: '480px', lineHeight: '1.6', marginBottom: '40px' }}>
                    Real-time market data. Vessel intelligence. Aircraft signals.<br />
                    ML-driven predictions. The terminal for people who need the edge.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <button className="btn-access" onClick={() => navigate('/login')}>ACCESS</button>
                    <div style={{ display: 'flex', gap: '20px', fontFamily: 'IBM Plex Mono', fontSize: '11px', color: '#444' }}>
                        <span><span style={{ color: '#00FF41', animation: 'blink 2s step-end infinite' }}>●</span> {vesselCount.toLocaleString()} VESSELS</span>
                        <span><span style={{ color: '#00FF41', animation: 'blink 2.2s step-end infinite' }}>●</span> {flightCount.toLocaleString()} FLIGHTS</span>
                        <span><span style={{ color: '#00FF41', animation: 'blink 1.8s step-end infinite' }}>●</span> {signalCount.toLocaleString()} SIGNALS</span>
                    </div>
                </div>
            </section>

            {/* Section 1: Map */}
            <div ref={mapSectionRef}>
                <MapSection vessels={vessels.slice(0, 100)} aircraft={aircraft.slice(0, 50)} />
            </div>

            {/* Section 2: Signal card */}
            <div ref={signalSectionRef}>
                <SignalSection intel={intelFeed[0]} />
            </div>

            {/* Section 3: Pricing */}
            <div ref={pricingSectionRef}>
                <PricingSection onAccess={() => navigate('/login')} />
            </div>

            {/* Footer */}
            <footer style={{ background: '#0A0A0A', borderTop: '1px solid #1A1A1A', padding: '24px 8%', display: 'flex', justifyContent: 'space-between', fontFamily: 'IBM Plex Mono', fontSize: '11px', color: '#333' }}>
                <div>AXIOM  ·  INTELLIGENCE TERMINAL</div>
                <div>© 2026  ·  RESTRICTED ACCESS  ·  TERMS</div>
            </footer>
        </div>
    );
};

const MapSection = ({ vessels, aircraft }) => {
    const containerRef = useRef(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) setIsVisible(true);
        }, { threshold: 0.3 });
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    return (
        <section ref={containerRef} style={{ height: '100vh', display: 'flex', borderTop: '1px solid #1A1A1A' }}>
            <div style={{ width: '60%', height: '100%', borderRight: '1px solid #1A1A1A' }}>
                <MapContainer center={[20, 0]} zoom={2} style={{ height: '100%', background: '#000' }} zoomControl={false} attributionControl={false}>
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                    {vessels.map((v, i) => (
                        <CircleMarker
                            key={`v-${v.mmsi || i}`}
                            center={[v.lat, v.lon]}
                            radius={2.5}
                            fillColor="#FF6600"
                            color="transparent"
                            fillOpacity={0.6}
                        />
                    ))}
                    {aircraft.map((a, i) => (
                        <CircleMarker
                            key={`a-${a.icao24 || i}`}
                            center={[a.lat, a.lon]}
                            radius={1.5}
                            fillColor="#00FF41"
                            color="transparent"
                            fillOpacity={0.8}
                        />
                    ))}
                </MapContainer>
            </div>
            <div style={{ width: '40%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 5%' }}>
                <h2 style={{ fontFamily: 'IBM Plex Mono', fontSize: '28px', color: '#E8E8E8', lineHeight: '1.2', margin: '0 0 24px 0' }}>
                    LIVE TELEMETRY.<br />TRACKED IN REAL-TIME.
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: '#555', fontSize: '14px', fontFamily: 'IBM Plex Sans Condensed' }}>
                </div>
            </div>
        </section>
    );
};

const SignalSection = ({ intel }) => {
    const containerRef = useRef(null);
    const [shouldType, setShouldType] = useState(false);
    const [typedLines, setTypedLines] = useState([]);

    // Generate dynamic lines based on real intel or fallback
    const signalTime = intel?.timestamp ? new Date(intel.timestamp).toLocaleTimeString() : "READY";
    const signalLabel = intel?.symbol || "AXIOM";
    const direction = intel?.sentiment > 0 ? "▲ BULLISH" : "▼ BEARISH";
    const confidence = intel?.confidence ? `${Math.floor(intel.confidence * 100)}%` : "N/A";

    const lines = [
        `AXIOM · SIGNAL DETECTED                              ${signalTime}`,
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        `${signalLabel}.INTEL                                        DYNAMIC`,
        `DIRECTION         ${direction}`,
        `CONFIDENCE        ${confidence}          [████████░░]`,
        `SUMMARY           ${intel?.title || "Monitoring global macro shifts..."}`,
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        `GEO SOURCE        ${intel?.source || "DISTRIBUTED SENSOR NETWORK"}`
    ];

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) setShouldType(true);
        }, { threshold: 0.5 });
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!shouldType) return;
        let currentLine = 0;
        let charIndex = 0;
        const speed = 15;
        let timeoutId;

        const typeChar = () => {
            if (currentLine >= lines.length) return;
            const lineIdx = currentLine;
            const charIdx = charIndex;

            setTypedLines(prev => {
                const updated = [...prev];
                if (!updated[lineIdx]) updated[lineIdx] = "";
                updated[lineIdx] = lines[lineIdx]?.substring(0, charIdx + 1) || "";
                return updated;
            });
            
            charIndex++;
            if (charIndex >= lines[lineIdx].length) {
                currentLine++;
                charIndex = 0;
                timeoutId = setTimeout(typeChar, 60);
            } else {
                timeoutId = setTimeout(typeChar, speed);
            }
        };
        typeChar();
        
        return () => clearTimeout(timeoutId);
    }, [shouldType, intel]);

    return (
        <section ref={containerRef} style={{ background: '#0A0A0A', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', borderTop: '1px solid #1A1A1A' }}>
            <div style={{ width: '100%', maxWidth: '680px', background: '#0D0D0D', border: '1px solid #1A1A1A', padding: '24px 32px', fontFamily: 'IBM Plex Mono', color: '#888', fontSize: '13px', minHeight: '330px' }}>
                {typedLines.map((line, i) => {
                    let color = '#888';
                    if (line.includes('SIGNAL DETECTED')) color = '#FF6600';
                    if (line.includes('BULLISH')) color = '#00FF41';
                    if (line.includes('[████████░░]')) {
                        return (
                            <div key={i} style={{ marginBottom: '8px', whiteSpace: 'pre' }}>
                                {line.split('[')[0]}
                                <span style={{ color: '#00FF41' }}>[{line.split('[')[1] || ''}</span>
                            </div>
                        )
                    }
                    return <div key={i} style={{ color, marginBottom: '8px', whiteSpace: 'pre' }}>{line}</div>
                })}
            </div>
        </section>
    );
};

const PricingSection = ({ onAccess }) => {
    const containerRef = useRef(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) setIsVisible(true);
        }, { threshold: 0.5 });
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    return (
        <section ref={containerRef} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 8%', borderTop: '1px solid #1A1A1A' }}>
            <div style={{ fontFamily: 'IBM Plex Mono', fontSize: '10vw', letterSpacing: '-0.02em', lineHeight: '1' }}>
                <div style={{ color: '#333', opacity: isVisible ? 1 : 0, transition: 'opacity 0.6s ease' }}>BLOOMBERG.</div>
                <div style={{ color: '#333', opacity: isVisible ? 1 : 0, transition: 'opacity 0.6s ease' }}>$25,000/YEAR.</div>
                <div style={{ color: '#FF6600', opacity: isVisible ? 1 : 0, transition: 'opacity 0.6s ease 0.4s', marginTop: '20px' }}>AXIOM.</div>
                <div style={{ color: '#E8E8E8', opacity: isVisible ? 1 : 0, transition: 'opacity 0.6s ease 0.8s' }}>LESS.</div>
            </div>
            <div style={{ marginTop: '40px', color: '#444', fontSize: '13px', fontFamily: 'IBM Plex Mono', maxWidth: '500px', lineHeight: '1.6' }}>
                Full market intelligence. Vessel tracking. Aircraft signals.<br />
                Satellite overlays. ML ensemble predictions.
            </div>
            <button className="btn-access" style={{ marginTop: '32px', width: 'fit-content' }} onClick={onAccess}>ACCESS</button>
        </section>
    );
};

export default LandingPage;
