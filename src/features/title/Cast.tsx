import { img, type TitleDetail } from '../../data/catalogue';

export function Cast({ cast }: { cast: TitleDetail['cast'] }) {
  if (!cast.length) return null;
  return (
    <section className="mt-7">
      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-lo">Cast</h3>
      <div className="no-scrollbar -mx-5 mt-3 flex gap-4 overflow-x-auto px-5">
        {cast.map((c) => (
          <div key={c.name + c.character} className="w-[72px] shrink-0 text-center">
            <div className="mx-auto h-[68px] w-[68px] overflow-hidden rounded-full bg-bg-2">
              {c.profile ? (
                <img src={img(c.profile, 'w185')} alt="" loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center text-lg font-semibold text-lo">{c.name[0]}</div>
              )}
            </div>
            <div className="mt-1.5 line-clamp-2 text-[11.5px] font-semibold leading-tight">{c.name}</div>
            <div className="mt-0.5 line-clamp-1 text-[10.5px] text-lo">{c.character}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
