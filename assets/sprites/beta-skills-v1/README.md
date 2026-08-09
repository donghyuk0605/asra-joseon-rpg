# Beta skill icon image set

The approved source contact sheet lives in `source/beta-skill-icon-sheet-v1.png`.
It is an original 6x3 Joseon dark-fantasy icon set with no text embedded in the artwork.

Runtime order:

1. Sword: whirlwind, leap strike, moon dash, crescent wave, tidebreaker step, blade mastery.
2. Archer: Haemosu volley, falcon seeker, iron cavalry shot, crescent arrow rain, beacon volley, great-bow mastery.
3. Mudang/common: spirit bell, talisman flame, soul binding, possession, iron constitution, insight.

Run `npm run build:skill-icons` after replacing the source. The build step normalizes every cell to 256x256 and emits a web-optimized 6x3 atlas.
