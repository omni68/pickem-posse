import * as React from 'react';
import Box from '@mui/material/Box';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';

import Grid from '@mui/material/Unstable_Grid2'; // Grid version 2

class Weeks extends React.Component 
{
	constructor(props) {
		super(props);
		const default_bettor = this.props.data.bettors[0].name;
		const default_week = this.props.data.weeks[0].index;
		this.state = { 
			bettor: default_bettor,
			bettor_games: this.props.data.games.filter((g) => g.game_bettor === default_bettor && g.week_sheet_index === default_week),
			week: default_week,
		};
	}

	handleChangeBettor = (event: SelectChangeEvent) => {
		this.setState((state) => (Object.assign(state, { 
			bettor: event.target.value,
			bettor_games: this.getGamesByBettorAndWeek(event.target.value, state.week)
		})));
	};

	handleChangeWeek = (event: SelectChangeEvent) => {
		this.setState((state) => (Object.assign(state, { 
			week: event.target.value,
			bettor_games: this.getGamesByBettorAndWeek(state.bettor, event.target.value)
		})));
	};

	getYourBetInfo = (g, ah) => {
		if(g.game_bettor_pick !== ah) { return ""; }

		const isHomerPick = g.game_bettor_pick === this.home;
		const isGameOver = !!g.game_winner;
		const pick = isHomerPick ? g.game_home : g.game_away;
		let msg = isHomerPick 
			? `${g.game_dollars_home} to win ${g.game_dollars_away}`
			: `${g.game_dollars_away} to win ${g.game_dollars_home}`;

		if(isGameOver) 
		{ 
			msg = `your payout was ${g.game_bettor_dollars_payout}`;
		}

  		return `${pick} (${msg})`;
	};

	getYourBetInfoAway = (g) => { return this.getYourBetInfo(g, "away"); }
	getYourBetInfoHome = (g) => { return this.getYourBetInfo(g, "home"); }

	getBettorsForGame = (g, ha) => {
		return this.props.data.games
			.filter((ga) => 
				ga.game_week_index === g.game_week_index 
				&& ga.week_sheet_index === g.week_sheet_index
				&& ga.game_bettor_pick === ha)
			.map((ga) => ga.game_bettor.split(" ")[0])
			.sort()
			.join(", ");
	}

	getGamesByBettorAndWeek = (b, w) => {
		return this.props.data.games.filter((g) => g.game_bettor === b && g.week_sheet_index === w);
	}

 	render()
 	{
 		return (
 			<Grid container spacing={2}>
				<Grid xs={12}>
			      <FormControl fullWidth>
			        <InputLabel id="demo-simple-select-label">Bettor</InputLabel>
			        <Select
			          labelId="demo-simple-select-label"
			          id="demo-simple-select"
			          value={this.state.bettor}
			          label="Bettor"
			          onChange={this.handleChangeBettor}
			        >
			          {this.props.data.bettors.map((b, i) => <MenuItem value={b.name} key={i}>#{b.rank} ({b.earnings}) - {b.name}</MenuItem>)}
			        </Select>
			      </FormControl>
			    </Grid>

			    <Grid xs={12}>
			      <FormControl fullWidth>
			        <InputLabel id="demo-simple-select-label">Week</InputLabel>
			        <Select
			          labelId="demo-simple-select-label"
			          id="demo-simple-select"
			          value={this.state.week}
			          label="Week"
			          onChange={this.handleChangeWeek}
			        >
			          {this.props.data.weeks.map((w, i) => <MenuItem value={w.index} key={i}>{w.name} ({this.getGamesByBettorAndWeek(this.state.bettor,w.index)[0].week_payout})</MenuItem>)}
			        </Select>
			      </FormControl>
			    </Grid>

			    {this.state.bettor_games.map((g, i) => 
			    	<Grid xs={12}>
				    	<TableContainer component={Paper} key={i}>
					      <Table class={g.game_winner ? "game-over" : "game-pending"} sx={{ minWidth: 650 }} aria-label="simple table">
					        <TableHead>
					          <TableRow>
					            <TableCell>{g.game_date_display} @ {g.game_time_display ?? "Time TBD"}</TableCell>
					            <TableCell>Score</TableCell>
					            <TableCell>Your Bet</TableCell>
					            <TableCell>Bettors</TableCell>
					          </TableRow>
					        </TableHead>
					        <TableBody>
					            <TableRow
					              key={String(i) + g.game_away}
					              sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
					            >
					              <TableCell>{g.game_away} {g.game_home_spread > 0 ? `(-${g.game_home_spread})` : ""}</TableCell>
					              <TableCell>{g.game_score_away ?? "--"}</TableCell>
					              <TableCell>{this.getYourBetInfoAway(g)}</TableCell>
					              <TableCell>
				              			{g.game_bettors_away} of {g.game_bettors_away + g.game_bettors_home}
				              			<p>{this.getBettorsForGame(g, "away")}</p>
			              			</TableCell>
					            </TableRow>
					            <TableRow
					              key={String(i) + g.game_home}
					              sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
					            >
									<TableCell>
										{g.game_home} {g.game_home_spread < 0 ? `(${g.game_home_spread})` : ""}
									</TableCell>
									<TableCell>{g.game_score_home ?? "--"}</TableCell>
									<TableCell>{this.getYourBetInfoHome(g)}</TableCell>
									<TableCell>
										{g.game_bettors_home} of {g.game_bettors_away + g.game_bettors_home}
										<p>{this.getBettorsForGame(g, "home")}</p>
									</TableCell>
					            </TableRow>
					        </TableBody>
					      </Table>
					    </TableContainer>
				    </Grid>
	    		)}
			</Grid>
		);
	}
}

export default Weeks;