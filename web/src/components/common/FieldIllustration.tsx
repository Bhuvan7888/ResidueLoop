interface FieldIllustrationProps {
  className?: string
}

export function FieldIllustration({ className }: FieldIllustrationProps) {
  return (
    <svg viewBox="0 0 680 560" className={className} aria-hidden="true" focusable="false">
      <path d="M33 384C132 305 204 332 294 385s191 68 352-26v167H33V384Z" fill="var(--bg-subtle)" />
      <path d="M30 454c118-83 192-63 282-14 95 52 193 46 334-28v114H30v-72Z" fill="var(--accent-primary)" />
      <path d="M32 490c99-60 195-56 288-4 90 49 192 36 326-27v67H32v-36Z" fill="var(--text-primary)" opacity=".93" />
      <path d="M113 278c-25-51-19-113 17-147M146 285c-11-71 10-126 58-160M190 292c6-65 42-108 96-133M238 299c26-52 71-82 125-91" fill="none" stroke="var(--accent-primary)" strokeLinecap="round" strokeWidth="7" />
      <g className="field-illustration__bale">
        <ellipse cx="480" cy="304" rx="97" ry="46" fill="var(--bg-elevated)" stroke="var(--text-primary)" strokeWidth="4" />
        <path d="M383 304v78c0 25 43 46 97 46s97-21 97-46v-78" fill="var(--bg-elevated)" stroke="var(--text-primary)" strokeWidth="4" />
        <ellipse cx="480" cy="304" rx="53" ry="24" fill="var(--accent-primary)" stroke="var(--text-primary)" strokeWidth="4" />
        <path d="M432 328c21 26 68 31 97 5M453 281c5 17 8 35 7 54M493 280c-2 17-1 35 4 54" fill="none" stroke="var(--text-primary)" strokeWidth="4" />
      </g>
      <circle cx="109" cy="110" r="49" fill="var(--accent-primary)" />
      <path d="M541 95c28 17 44 43 49 78-34-7-60-27-77-59 8-9 17-15 28-19Z" fill="var(--bg-subtle)" stroke="var(--text-primary)" strokeWidth="4" />
    </svg>
  )
}
