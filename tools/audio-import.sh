#!/usr/bin/env bash
# Re-import Cosmic Shore's music and effects into assets/audio (docs/reference/AUDIO.md). Needs ffmpeg and a
# checkout of froglet-studio/cosmic-shore beside this one (CS=...). Music: loudness-normalised to -16 LUFS, 96 kbps
# stereo MP3. Effects: leading and trailing silence trimmed, peak at -1 dB, 96 kbps mono MP3.
set -e
CS=${CS:-../Cosmic-Shore}
OUT=${OUT:-assets/audio}
mkdir -p $OUT/music $OUT/sfx
m() { # key source
  ffmpeg -nostdin -v error -y -i "$CS/$2" -vn -af "loudnorm=I=-16:TP=-1.5:LRA=11" -ac 2 -ar 44100 -c:a libmp3lame -b:a 96k -map_metadata -1 "$OUT/music/$1.mp3"
}
s() { # key source [maxsec]
  local dur=${3:-12}
  local peak=$(ffmpeg -nostdin -v info -i "$CS/$2" -t $dur -af volumedetect -f null - 2>&1 | grep max_volume | sed 's/.*max_volume: \(-\?[0-9.]*\) dB/\1/')
  local gain=$(python3 -c "print(round(-1.0-($peak),2))")
  ffmpeg -nostdin -v error -y -i "$CS/$2" -vn -t $dur -af "silenceremove=start_periods=1:start_threshold=-55dB,areverse,silenceremove=start_periods=1:start_threshold=-60dB,areverse,volume=${gain}dB,afade=t=out:st=$(python3 -c "print(max(0,$dur-0.4))"):d=0.4" -ac 1 -ar 44100 -c:a libmp3lame -b:a 96k -map_metadata -1 "$OUT/sfx/$1.mp3"
}
FQ="Assets/_Audio/Music/Full Quality MP3"
A="Cosmic Shore/Assets"
m space-gliding "$FQ/SPACE GLIDING.mp3"
m sky-fire "$FQ/SKY FIRE.mp3"
m disoriented "$FQ/DISORIENTED.mp3"
m severity "$FQ/SEVERITY.mp3"
m secret-hide-away "$FQ/SECRET HIDE AWAY.mp3"
m waited-so-long "$FQ/I've waited so long.mp3"
m end-game-outro "$FQ/End game outro updated.mp3"
m cosmic-shore-2 "Assets/_Audio/Music/COSMIC SHORE 2 TUNE.wav"
m cosmic-shore-3 "Assets/_Audio/Music/cosmic shore 3 chalres.wav"
m cosmic-shore-3-loop "Assets/_Audio/Music/cosmic shore 3 looped 1.wav"
m chill-time-3 "Assets/_Audio/Music/cosmic shore chill time 3.wav"
# menus
s click "$A/cosmic shore click.wav"
s hover "Assets/_Audio/Sounds/Hover.ogg"
s confirm "$A/Cosmic shore confirm.wav"
s denied "$A/Cosmic shore denied.wav"
s open "$A/OpenView.wav"
s close "$A/Cosmic shore close view.wav"
s switch "$A/cosmic shore switch screen 2.wav"
s switch-2 "$A/cosmic shore switch screen.wav"
s lets-go "$A/LetsGo.wav"
s small-reward "$A/SmallReward.wav"
s big-reward "$A/BigReward.wav"
s upgrade "$A/Upgrade.wav"
s redeem "$A/RedeemTicket.wav"
s score "$A/Data 24.wav"
# combat
s laser "$A/cosmic shore laser 2.wav"
s impact "$A/ship impact cosmic shore.wav"
s creature-hit "$A/CREATURE BREAKS GLASS COSMIC SHORE.wav"
for i in 1 2 3 4 5 6; do s kill-$i "Assets/_Audio/Sounds/MiguelSFX/crys_enemlayer_var3_MN1-00$i.wav"; done
s explosion "$A/explosion.wav" 4
s mine "$A/END GAME crash.mp3" 4
s game-over "$A/END GAME after crash.mp3"
s shield-up "$A/sheild cosmic shore.wav"
s shield-down "$A/shield down.wav"
s crystal "$A/Crystal_Collision_Amplified.wav"
s block-break "$A/Cosmic shore block break.wav"
s energy "$A/EnergyGain.wav"
s speed-burst "$A/SpeedBurst.wav"
s boost "$A/Cosmic shore Boost.wav"
s skim "$A/cosmic shore skim 3.wav"
s drift-release "$A/drift let go cosmic shore.wav" 5
s bump "$A/track colide cosmic shroe.wav"
s spawn "$A/cosmic shore  mass shark spawn.wav" 6
s goal "$A/cosmic shore goal line sound.wav" 6
for e in mass:MASS\ JOUST.wav charge:charge\ joust.wav space:SPACE\ JOUST1.wav time:time\ joust.wav; do s joust-${e%%:*} "$A/${e#*:}"; done
s ally-mass "$A/cosmic shore mass ally joust (buff).wav"
s ally-charge "$A/cosmic shore charge ally joust (buff).wav"
s ally-space "$A/cosmic shore space ally joust (buff).wav"
s ally-time "$A/cosmic shore time ally joust (buff).wav"
s comeback-mass "$A/cosmic shore comeback mass.wav"
s comeback-charge "$A/cosmic shore comeback charge.wav"
s comeback-space "$A/cosmic shore comeback space.wav"
s comeback-time "$A/cosmic shore comeback time.wav"
