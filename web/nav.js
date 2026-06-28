// Barra de navegación inferior estilo app. Se incluye en las páginas internas
// (no en login). Muestra la pestaña Admin solo si el usuario es admin.
(function () {
  const sbN = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  const here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const base = [
    ['index.html', '➕', 'Registrar'],
    ['estadisticas.html', '📊', 'Stats'],
    ['registros.html', '📋', 'Lista'],
  ];
  sbN.auth.getSession().then(({ data }) => {
    const isAdmin = data.session?.user?.app_metadata?.role === 'admin';
    const tabs = isAdmin ? base.concat([['admin.html', '🛠️', 'Admin']]) : base;
    const nav = document.createElement('nav');
    nav.className = 'bottom-nav';
    nav.innerHTML = tabs.map(([href, icon, label]) =>
      `<a href="${href}" class="${href === here ? 'active' : ''}"><span class="i">${icon}</span><span>${label}</span></a>`
    ).join('');
    document.body.appendChild(nav);
  });
})();
