import { Outlet, Link } from "react-router-dom";

const Season = () => {
  return (
    <>
      <nav>
        <ul>
          <li>
            <Link to="/">Weeks</Link>
          </li>
          <li>
            <Link to="/week">Week</Link>
          </li>
          <li>
            <Link to="/game">Game</Link>
          </li>
        </ul>
      </nav>

      <Outlet />
    </>
  )
};

export default Season;