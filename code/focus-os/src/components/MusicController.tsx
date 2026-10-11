import React, { useState } from 'react';
import { Music, Radio, Disc, ExternalLink, Play, Pause, Volume2, Sparkles, Check } from 'lucide-react';
import { MusicStation } from '../types';
import { CURATED_MUSIC_STATIONS } from '../data/initialData';
import { playMechanicalClick, toggleRetroLofi } from '../utils/audio';

interface MusicControllerProps {
  soundEnabled: boolean;
  isRetroLofiActive: boolean;
  onToggleRetroLofi: (active: boolean) => void;
}

export const MusicController: React.FC<MusicControllerProps> = ({
  soundEnabled,
  isRetroLofiActive,
  onToggleRetroLofi,
}) => {
  const [selectedService, setSelectedService] = useState<'spotify' | 'applemusic' | 'retro_lofi'>('spotify');
  const [activeStation, setActiveStation] = useState<MusicStation>(CURATED_MUSIC_STATIONS[0]);
  const [customInputUrl, setCustomInputUrl] = useState('');
  const [customEmbedUrl, setCustomEmbedUrl] = useState<string | null>(null);

  // Filter curated stations by selected service
  const filteredStations = CURATED_MUSIC_STATIONS.filter((s) => s.service === selectedService);

  // Convert Spotify or Apple Music URLs into embeddable format
  const handleLoadCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInputUrl.trim()) return;
    playMechanicalClick(soundEnabled);

    const input = customInputUrl.trim();

    if (input.includes('spotify.com')) {
      // e.g. https://open.spotify.com/playlist/37i9dQZF1DXdLEN7aqioXM or open.spotify.com/track/...
      let embed = input;
      if (!input.includes('/embed/')) {
        embed = input.replace('open.spotify.com/', 'open.spotify.com/embed/');
      }
      if (!embed.includes('utm_source=generator')) {
        embed += (embed.includes('?') ? '&' : '?') + 'utm_source=generator&theme=0';
      }
      setCustomEmbedUrl(embed);
      setSelectedService('spotify');
    } else if (input.includes('music.apple.com')) {
      // e.g. https://music.apple.com/us/playlist/pure-focus/pl.u-mJy81N4CNV369
      let embed = input;
      if (!input.includes('embed.music.apple.com')) {
        embed = input.replace('music.apple.com', 'embed.music.apple.com');
      }
      setCustomEmbedUrl(embed);
      setSelectedService('applemusic');
    } else {
      setCustomEmbedUrl(input);
    }
  };

  const handleSelectStation = (station: MusicStation) => {
    playMechanicalClick(soundEnabled);
    setActiveStation(station);
    setCustomEmbedUrl(null);

    if (station.service === 'retro_lofi') {
      onToggleRetroLofi(true);
    } else {
      onToggleRetroLofi(false);
    }
  };

  const currentEmbedSrc = customEmbedUrl || (activeStation.service !== 'retro_lofi' ? activeStation.embedSrc : null);

  return (
    <div className="w-full space-y-4">
      {/* Top Header Card */}
      <div className="bg-[#CADBFB] border-2 border-[#2D3142] p-4 pixel-shadow">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#2D3142] pb-2 mb-3">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-[#2D3142]" />
            <span className="font-mono text-xs sm:text-sm font-bold text-[#2D3142] uppercase">
              FOCUS AUDIO & MUSIC CONTROLLER
            </span>
          </div>
          <span className="font-mono text-[10px] px-2 py-0.5 bg-[#FAF8F5] border border-[#2D3142] text-[#2D3142]">
            STREAMING COMPATIBLE
          </span>
        </div>

        <p className="font-sans text-xs text-[#2D3142]/80">
          Control your background study music while maintaining focus. Switch between Spotify, Apple Music, or built-in retro 8-bit chill stations.
        </p>

        {/* Service Switcher Tabs */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mt-3 select-none">
          <button
            id="service-spotify-btn"
            onClick={() => {
              playMechanicalClick(soundEnabled);
              setSelectedService('spotify');
              const sp = CURATED_MUSIC_STATIONS.find((s) => s.service === 'spotify');
              if (sp) setActiveStation(sp);
              onToggleRetroLofi(false);
            }}
            className={`pixel-btn min-h-[40px] flex items-center justify-center gap-1 py-1.5 px-1 sm:px-2 border-2 border-[#2D3142] font-mono text-[10px] sm:text-xs font-bold rounded-xs ${
              selectedService === 'spotify'
                ? 'bg-[#7FB685] text-[#2D3142] pixel-shadow font-bold'
                : 'bg-[#FAF8F5] text-[#2D3142]/70'
            }`}
          >
            <span>SPOTIFY</span>
          </button>

          <button
            id="service-apple-btn"
            onClick={() => {
              playMechanicalClick(soundEnabled);
              setSelectedService('applemusic');
              const am = CURATED_MUSIC_STATIONS.find((s) => s.service === 'applemusic');
              if (am) setActiveStation(am);
              onToggleRetroLofi(false);
            }}
            className={`pixel-btn min-h-[40px] flex items-center justify-center gap-1 py-1.5 px-1 sm:px-2 border-2 border-[#2D3142] font-mono text-[10px] sm:text-xs font-bold rounded-xs ${
              selectedService === 'applemusic'
                ? 'bg-[#F4A261] text-[#2D3142] pixel-shadow font-bold'
                : 'bg-[#FAF8F5] text-[#2D3142]/70'
            }`}
          >
            <span>APPLE</span>
          </button>

          <button
            id="service-retro-btn"
            onClick={() => {
              playMechanicalClick(soundEnabled);
              setSelectedService('retro_lofi');
              const r = CURATED_MUSIC_STATIONS.find((s) => s.service === 'retro_lofi');
              if (r) setActiveStation(r);
            }}
            className={`pixel-btn min-h-[40px] flex items-center justify-center gap-1 py-1.5 px-1 sm:px-2 border-2 border-[#2D3142] font-mono text-[10px] sm:text-xs font-bold rounded-xs ${
              selectedService === 'retro_lofi'
                ? 'bg-[#F8C390] text-[#2D3142] pixel-shadow font-bold'
                : 'bg-[#FAF8F5] text-[#2D3142]/70'
            }`}
          >
            <span>8-BIT LO-FI</span>
          </button>
        </div>
      </div>

      {/* Embedded Player Showcase */}
      <div className="bg-[#FAF8F5] border-2 border-[#2D3142] p-4 sm:p-5 pixel-shadow">
        <div className="flex items-center justify-between border-b-2 border-[#2D3142] pb-2 mb-3">
          <div className="flex items-center gap-2">
            <Disc className="w-4 h-4 text-[#7FB685] animate-spin" style={{ animationDuration: '8s' }} />
            <span className="font-mono text-xs font-bold uppercase text-[#2D3142]">
              {customEmbedUrl ? 'CUSTOM PLAYLIST' : activeStation.name}
            </span>
          </div>

          <span className="font-mono text-[10px] px-1.5 py-0.5 bg-[#F2EFE9] border border-[#2D3142] text-[#2D3142]">
            {selectedService.toUpperCase()}
          </span>
        </div>

        {/* If Spotify or Apple Music is active, render the real official web player embed */}
        {selectedService !== 'retro_lofi' && currentEmbedSrc && (
          <div className="w-full bg-[#FAF8F5] border-2 border-[#2D3142] overflow-hidden pixel-shadow-sm min-h-[152px]">
            <iframe
              src={currentEmbedSrc}
              width="100%"
              height="152"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              title="Music Player Widget"
              className="w-full bg-[#FAF8F5]"
            />
          </div>
        )}

        {/* If 8-Bit Retro Lo-Fi is selected */}
        {selectedService === 'retro_lofi' && (
          <div className="bg-[#F2EFE9] border-2 border-[#2D3142] p-6 text-center pixel-inset">
            <div className="font-mono text-sm font-bold text-[#2D3142] mb-1">
              {activeStation.name}
            </div>
            <p className="font-sans text-xs text-[#2D3142]/70 max-w-md mx-auto mb-4">
              Calming, soft low-pass chord progressions synthesized via Web Audio. Zero lyrics, low distraction for ADHD hyperfocus.
            </p>

            <button
              id="toggle-lofi-stream-btn"
              onClick={() => {
                playMechanicalClick(soundEnabled);
                onToggleRetroLofi(!isRetroLofiActive);
              }}
              className={`pixel-btn inline-flex items-center gap-2 px-6 py-2.5 border-2 border-[#2D3142] font-mono text-xs font-bold ${
                isRetroLofiActive
                  ? 'bg-[#F4A261] text-[#2D3142] pixel-shadow'
                  : 'bg-[#7FB685] text-[#2D3142] pixel-shadow'
              }`}
            >
              {isRetroLofiActive ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>PAUSE 8-BIT LO-FI</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>PLAY 8-BIT LO-FI CHORDS</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Custom Playlist Loader Input */}
        <div className="mt-4 pt-3 border-t border-[#2D3142]/20">
          <div className="font-mono text-[10px] font-bold text-[#2D3142]/80 uppercase mb-1.5">
            PASTE YOUR OWN SPOTIFY OR APPLE MUSIC LINK:
          </div>
          <form onSubmit={handleLoadCustomUrl} className="flex flex-col sm:flex-row gap-2">
            <input
              id="custom-music-url-input"
              type="text"
              value={customInputUrl}
              onChange={(e) => setCustomInputUrl(e.target.value)}
              placeholder="e.g. https://open.spotify.com/playlist/... or https://music.apple.com/..."
              className="flex-1 px-3 py-2 bg-[#FAF8F5] border-2 border-[#2D3142] font-mono text-xs text-[#2D3142] pixel-inset focus:outline-none min-h-[40px]"
            />
            <button
              type="submit"
              id="load-custom-music-btn"
              className="pixel-btn min-h-[40px] px-4 py-2 bg-[#7FB685] hover:bg-[#A3CFAB] border-2 border-[#2D3142] font-mono text-xs font-bold text-[#2D3142] pixel-shadow-sm whitespace-nowrap shrink-0 text-center"
            >
              LOAD PLAYLIST
            </button>
          </form>
        </div>
      </div>

      {/* Curated Stations Grid */}
      <div className="bg-[#F2EFE9] border-2 border-[#2D3142] p-4 pixel-shadow">
        <div className="flex items-center justify-between border-b-2 border-[#2D3142] pb-2 mb-3">
          <span className="font-mono text-xs font-bold uppercase text-[#2D3142]">
            CURATED FOCUS STATIONS ({selectedService.toUpperCase()})
          </span>
          <span className="font-mono text-[10px] text-[#2D3142]/70">
            1-TAP TO SWITCH
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {filteredStations.map((station) => {
            const isSelected = activeStation.id === station.id && !customEmbedUrl;
            return (
              <button
                key={station.id}
                id={`station-card-${station.id}`}
                onClick={() => handleSelectStation(station)}
                className={`pixel-btn p-3 border-2 border-[#2D3142] text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#CADBFB] text-[#2D3142] pixel-shadow font-bold'
                    : 'bg-[#FAF8F5] hover:bg-[#FAF8FF] text-[#2D3142]/80 pixel-shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[9px] px-1.5 py-0.5 bg-[#FAF8F5] border border-[#2D3142] font-bold">
                      {station.tag}
                    </span>
                    {isSelected && <span className="font-mono text-xs text-[#7FB685] font-bold">ACTIVE ◆</span>}
                  </div>
                  <div className="font-mono text-xs font-bold text-[#2D3142] line-clamp-1">
                    {station.name}
                  </div>
                </div>
                <div className="font-sans text-[11px] text-[#2D3142]/70 mt-1">
                  By {station.curator}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
