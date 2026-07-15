import { expect, test } from '@playwright/test';

test('horizontal homepage responds to wheel and navigation', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Fusang/);
  await expect(page.getByRole('heading', { name: 'Fusang', exact: true })).toBeVisible();

  const portrait = page.locator('[data-cycle="middle"] .particle-portrait');
  const portraitCanvas = portrait.locator('canvas');
  await expect(portraitCanvas).toHaveAttribute('data-particle-ready', 'true');
  await expect(portrait.locator('img')).toHaveCount(0);
  const particleCount = Number(await portraitCanvas.getAttribute('data-particle-count'));
  expect(particleCount).toBeGreaterThan(1000);
  const portraitBox = await portrait.boundingBox();
  const viewport = page.viewportSize();
  expect(portraitBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(portraitBox!.x).toBeGreaterThan(viewport!.width * 0.58);
  expect(portraitBox!.y).toBeGreaterThan(viewport!.height * 0.35);

  await page.waitForTimeout(800);
  const particleFrameBefore = await portraitCanvas.evaluate((node) => (node as HTMLCanvasElement).toDataURL());
  await page.mouse.move(portraitBox!.x + portraitBox!.width * 0.55, portraitBox!.y + portraitBox!.height * 0.55);
  await page.waitForTimeout(180);
  const particleFrameAfter = await portraitCanvas.evaluate((node) => (node as HTMLCanvasElement).toDataURL());
  expect(particleFrameAfter).not.toBe(particleFrameBefore);

  const cursor = page.locator('[data-site-cursor]');
  const cursorRing = page.locator('svg.site-cursor__ring');
  await expect(cursor).toHaveClass(/is-visible/);
  await expect(page.locator('body')).toHaveCSS('cursor', 'none');
  await expect(cursorRing).toHaveAttribute('viewBox', '0 0 58 58');
  await expect(cursorRing.locator('circle')).toHaveAttribute('vector-effect', 'non-scaling-stroke');
  await page.locator('[data-cycle="middle"] .panorama-link').first().hover();
  await expect(cursor).toHaveClass(/is-interactive/);
  await expect(cursor).toHaveClass(/is-entering/);
  await expect(cursorRing).toHaveCSS('animation-name', 'cursor-ring-collapse');

  await page.locator('.site-nav__link').first().hover();
  await expect(cursor).not.toHaveClass(/is-interactive/);
  await page.locator('[data-cycle="middle"] .panorama-link').first().hover();
  await expect(cursor).toHaveClass(/is-interactive/);
  await expect(cursor).not.toHaveClass(/is-entering/);

  await page.locator('[data-cycle="middle"] .home-copy h1').hover();
  await page.waitForTimeout(650);
  await page.locator('[data-cycle="middle"] .panorama-link').first().hover();
  await expect(cursor).toHaveClass(/is-entering/);

  const stage = page.locator('.panorama-stage');
  const before = await stage.evaluate((node) => getComputedStyle(node).transform);
  await page.mouse.move(720, 450);
  await page.mouse.wheel(0, 1200);
  await page.waitForTimeout(700);
  const after = await stage.evaluate((node) => getComputedStyle(node).transform);
  expect(after).not.toBe(before);

  await expect(page.locator('.panorama-shell')).toHaveCSS('user-select', 'none');
  await page.mouse.move(1050, 450);
  await page.mouse.down();
  await page.mouse.move(560, 450, { steps: 8 });
  await expect(page.locator('.panorama-shell')).toHaveCSS('cursor', 'none');
  await expect(cursor).toHaveClass(/is-visible/);
  await page.mouse.up();
  const dragRelease = await stage.evaluate((node) => getComputedStyle(node).transform);
  await page.waitForTimeout(280);
  const dragCoast = await stage.evaluate((node) => getComputedStyle(node).transform);
  expect(dragCoast).not.toBe(dragRelease);

  await page.locator('[data-panorama-target="writing"]').click();
  await page.waitForTimeout(1300);
  await expect(page).toHaveURL(/#writing$/);
  await expect(page.locator('[data-cycle="middle"] .scene--writing')).toBeInViewport();
  await expect(page.locator('[data-cycle="middle"] .writing-heading')).toHaveClass(/is-revealed/);
  await expect(page.locator('[data-cycle="middle"] .writing-heading h2')).toHaveCSS('white-space', 'nowrap');
});

test('cursor keeps one ring while moving between interactive elements', async ({ page }) => {
  await page.goto('/writing');
  const cursor = page.locator('[data-site-cursor]');
  const cards = page.locator('.writing-card');

  await cards.nth(0).hover();
  await expect(cursor).toHaveClass(/is-interactive/);
  await expect(cursor).toHaveClass(/is-entering/);
  const initialAnimationStart = await page.locator('.site-cursor__ring').evaluate((node) =>
    node.getAnimations()[0]?.startTime,
  );

  await cards.nth(1).hover();
  await expect(cursor).toHaveClass(/is-interactive/);
  const nextAnimationStart = await page.locator('.site-cursor__ring').evaluate((node) =>
    node.getAnimations()[0]?.startTime,
  );
  expect(nextAnimationStart).toBe(initialAnimationStart);
});

test('home hash and loop copies stay visually synchronized', async ({ page }) => {
  await page.goto('/#home');
  const shell = page.locator('.panorama-shell');
  await expect(shell).toBeVisible();
  await expect.poll(() => shell.evaluate((node) => node.scrollLeft)).toBe(0);

  const homeCopies = page.locator('.scene--home .home-copy');
  await expect(homeCopies).toHaveCount(3);
  await expect.poll(() => homeCopies.evaluateAll((nodes) =>
    nodes.map((node) => node.classList.contains('is-revealed')),
  )).toEqual([true, true, true]);

  const middleHome = page.locator('[data-cycle="middle"] .scene--home');
  await expect.poll(() => middleHome.evaluate((node) => Math.round(node.getBoundingClientRect().left))).toBe(0);
});

test('theme and collapsed navigation are real interactive states', async ({ page }) => {
  await page.goto('/writing');
  await page.evaluate(() => localStorage.setItem('arsvine-theme', 'dark'));
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const nav = page.locator('.site-nav');
  await expect(nav).toHaveCSS('width', '52px');
  const navCenter = await nav.evaluate((node) => node.getBoundingClientRect().x + node.getBoundingClientRect().width / 2);
  const indexCenter = await page.locator('.site-nav__index').first().evaluate((node) =>
    node.getBoundingClientRect().x + node.getBoundingClientRect().width / 2,
  );
  const themeCenter = await page.locator('.theme-toggle__disc').evaluate((node) =>
    node.getBoundingClientRect().x + node.getBoundingClientRect().width / 2,
  );
  expect(Math.abs(indexCenter - navCenter)).toBeLessThan(1);
  expect(Math.abs(themeCenter - navCenter)).toBeLessThan(1);
  await nav.hover();
  await expect(nav).toHaveCSS('width', '168px');
  const navLabelX = await page.locator('.site-nav__link .site-nav__label').first().evaluate((node) =>
    node.getBoundingClientRect().x,
  );
  const themeLabelX = await page.locator('.theme-toggle .site-nav__label').evaluate((node) =>
    node.getBoundingClientRect().x,
  );
  expect(Math.abs(themeLabelX - navLabelX)).toBeLessThan(1);

  const toggle = page.locator('[data-theme-toggle]');
  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('site links use soft navigation and cannot be dragged', async ({ page }) => {
  await page.goto('/writing');
  await expect(page.locator('.document-title')).toHaveCSS('white-space', 'nowrap');
  await page.evaluate(() => {
    (window as Window & { __softNavigationSentinel?: string }).__softNavigationSentinel = 'kept';
  });

  const aboutLink = page.locator('.site-nav__link[href="/about"]');
  await expect.poll(() => aboutLink.evaluate((node) =>
    getComputedStyle(node).getPropertyValue('-webkit-user-drag'),
  )).toBe('none');
  const dragPrevented = await aboutLink.evaluate((node) => {
    const event = new DragEvent('dragstart', { bubbles: true, cancelable: true });
    node.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(dragPrevented).toBe(true);

  const documentDragPrevented = await page.locator('.document-title').evaluate((node) => {
    const event = new DragEvent('dragstart', { bubbles: true, cancelable: true });
    node.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(documentDragPrevented).toBe(true);

  await aboutLink.click();
  await expect(page).toHaveURL(/\/about$/);
  await expect.poll(() => page.evaluate(() =>
    (window as Window & { __softNavigationSentinel?: string }).__softNavigationSentinel,
  )).toBe('kept');
});

test('archive title stays on one line', async ({ page }) => {
  await page.goto('/archive');
  await expect(page.locator('.document-title')).toHaveCSS('white-space', 'nowrap');
});

test('portrait mobile shows the landscape gate', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByText('请将设备横置')).toBeVisible();
});

test('all three reading layouts are statically reachable', async ({ page }) => {
  await page.goto('/writing/雨落在未命名的河上');
  await expect(page.locator('article')).toHaveClass(/article-shell--long/);
  await expect(page.getByRole('link', { name: '返回文章索引' })).toHaveAttribute('href', '/writing');
  await page.goto('/writing/苔痕');
  await expect(page.locator('article')).toHaveClass(/article-shell--vertical-short/);
  await expect(page.getByRole('link', { name: '返回文章索引' })).toBeVisible();
  await page.goto('/writing/窗上的河');
  await expect(page.locator('article')).toHaveClass(/article-shell--horizontal-short/);
});
