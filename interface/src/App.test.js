import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./pages/components', () => ({
  Header: () => {
    const {Link} = require('react-router-dom');
    return <Link to="/pool/e-space/0x1234?tab=unstake">eSpace pool</Link>;
  },
}));

jest.mock('./pages/Home', () => () => {
  const {useNavigate} = require('react-router-dom');
  const navigate = useNavigate();
  return <button onClick={() => navigate('/pool/core/cfxtest:sample?tab=stake')}>Open core pool</button>;
});

jest.mock('./pages/Pool', () => () => {
  const {useParams, useSearchParams} = require('react-router-dom');
  const useCurrentSpace = require('./hooks/useCurrentSpace').default;
  const {poolAddress} = useParams();
  const [search] = useSearchParams();
  return <div data-testid="pool">{useCurrentSpace()} {poolAddress} {search.get('tab')}</div>;
});

test('redirects unknown routes to the pool manager', async () => {
  window.history.replaceState({}, '', '/unknown');
  render(<App />);
  expect(await screen.findByRole('button', {name: 'Open core pool'})).toBeInTheDocument();
  expect(window.location.pathname).toBe('/pool-manage');
});

test('navigates to a core pool with its address and query parameters', async () => {
  window.history.replaceState({}, '', '/pool-manage');
  render(<App />);
  fireEvent.click(screen.getByRole('button', {name: 'Open core pool'}));
  expect(await screen.findByTestId('pool')).toHaveTextContent('core cfxtest:sample stake');
});

test('links to an eSpace pool with its address and query parameters', async () => {
  window.history.replaceState({}, '', '/pool-manage');
  render(<App />);
  fireEvent.click(screen.getByRole('link', {name: 'eSpace pool'}));
  expect(await screen.findByTestId('pool')).toHaveTextContent('eSpace 0x1234 unstake');
});
