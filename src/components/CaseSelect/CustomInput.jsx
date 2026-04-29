export default function CustomInput({ value, onChange }) {
  return (
    <div className="w-full">
      <label
        className="block mb-2 font-serif tracking-widest text-xs font-semibold"
        style={{ color: '#C9A84C', fontVariant: 'small-caps', letterSpacing: '0.15em' }}
      >
        OR ENTER YOUR OWN ACCUSATION
      </label>
      <textarea
        rows={3}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="The defendant stands accused of..."
        className="w-full font-serif resize-none outline-none transition-all duration-150"
        style={{
          background: '#0d0804',
          color: '#F5F0E8',
          border: '1px solid #3a2808',
          padding: '10px 12px',
          fontSize: '14px',
          lineHeight: '1.6',
        }}
        onFocus={e => { e.target.style.border = '1px solid #C9A84C'; }}
        onBlur={e => { e.target.style.border = '1px solid #3a2808'; }}
      />
    </div>
  );
}
