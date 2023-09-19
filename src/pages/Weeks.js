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

import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';

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
		this.home = "home";
		this.away = "away";
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
		let pick = isHomerPick ? g.game_home : g.game_away;

		if(g.is_game_of_the_week){ pick += isHomerPick ? ` ${g.game_bettor_home_prediction} - ${g.game_bettor_away_prediction}` : ` ${g.game_bettor_away_prediction} - ${g.game_bettor_home_prediction}`; }

		let msg = isHomerPick 
			? `${g.game_dollars_home} to win ${g.game_dollars_away}`
			: `${g.game_dollars_away} to win ${g.game_dollars_home}`;

		if(isGameOver) 
		{ 
			msg = `payout ${g.game_bettor_dollars_payout}`;
			if(g.week_bettor_jackpot_earnings !== "$0"){
				msg += ` plus JACKPOT WIN ${g.week_bettor_jackpot_earnings}`;
			}
		}

  		return `${pick} (${msg})`;
	};

	getYourBetInfoAway = (g) => { return this.getYourBetInfo(g, this.away); }
	getYourBetInfoHome = (g) => { return this.getYourBetInfo(g, this.home); }

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

			    {this.state.bettor_games.map((g, i) => <>
			    	{ g.is_game_of_the_week
			    		? <Grid xs={12}><Stack direction="row" spacing={1}>
			    			<Chip label={"Game of the Week"} variant="outlined" />
			    			<Chip label={`Jackpot ${g.week_jackpot_total}`} variant="outlined" /></Stack></Grid>
			    		: ""
		    		}
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
					              key={`${String(i)}-${this.away}`}
					              sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
					            >
					              <TableCell>{g.game_away} {g.game_home_spread > 0 ? `(-${g.game_home_spread})` : ""}</TableCell>
					              <TableCell>{g.game_score_away ?? "--"}</TableCell>
					              <TableCell>{this.getYourBetInfoAway(g)}</TableCell>
					              <TableCell>
				              			{g.game_bettors_away} of {g.game_bettors_away + g.game_bettors_home}
				              			<p>{this.getBettorsForGame(g, this.away)}</p>
			              			</TableCell>
					            </TableRow>
					            <TableRow
					              key={`${String(i)}-${this.home}`}
					              sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
					            >
									<TableCell>
										{g.game_home} {g.game_home_spread < 0 ? `(${g.game_home_spread})` : ""}
									</TableCell>
									<TableCell>{g.game_score_home ?? "--"}</TableCell>
									<TableCell>{this.getYourBetInfoHome(g)}</TableCell>
									<TableCell>
										{g.game_bettors_home} of {g.game_bettors_away + g.game_bettors_home}
										<p>{this.getBettorsForGame(g, this.home)}</p>
									</TableCell>
					            </TableRow>
					        </TableBody>
					      </Table>
					    </TableContainer>
				    </Grid>
	    		</>)}
			</Grid>
		);
	}
}

export default Weeks;