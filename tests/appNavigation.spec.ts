import { test, expect } from './fixtures';
import { ROUTES } from '../src/constants';

test.describe('navigating app', () => {
  test('generator page should render successfully', async ({ gotoPage, page }) => {
    await gotoPage(`/${ROUTES.Generator}`);
    await expect(page.getByText('OpenTelemetry JS Instrumentation Generator')).toBeVisible();
  });

  test('generator page should have service name input', async ({ gotoPage, page }) => {
    await gotoPage(`/${ROUTES.Generator}`);
    await expect(page.getByText('Service Name')).toBeVisible();
  });
});
