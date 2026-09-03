type CircuitGraph = Record<string, { type: string, inPorts: Record<string, { name: string, port: string }>, outPorts: Record<string, { name: string, port: string }[]>, cleanName?: string }>

function closeConnection(graph: CircuitGraph, input: { name: string, port: string }, cut: string, outputs: { name: string, port: string }[]) {
	const index = graph[input.name].outPorts[input.port].findIndex(connection => connection.name === cut)
	graph[input.name].outPorts[input.port].splice(index, 1)
	graph[input.name].outPorts[input.port] = graph[input.name].outPorts[input.port].concat(outputs.filter(output => !graph[input.name].outPorts[input.port].some(otherOutput => otherOutput.name === output.name && otherOutput.port === output.port)))
	
	for(const connection of outputs) {
		graph[connection.name].inPorts[connection.port] = input
	}
}

function portInputPort(graph: CircuitGraph, src: { name: string, port: string }, dst: { name: string, port: string }) {
	const srcNode = graph[src.name]
	const srcInputConnection = srcNode.inPorts[src.port]

	if(graph[srcInputConnection.name].outPorts[srcInputConnection.port]) {
		const index = graph[srcInputConnection.name].outPorts[srcInputConnection.port].findIndex(connection => connection.name === src.name && connection.port === src.port)
		graph[srcInputConnection.name].outPorts[srcInputConnection.port].splice(index, 1, dst)
	}
	
	const dstNode = graph[dst.name]
	dstNode.inPorts[dst.port] = srcInputConnection
}

function tiePorts(graph: CircuitGraph, src: { name: string, port: string }, dst: { name: string, port: string }) {
	if(!graph[src.name].outPorts[src.port]) graph[src.name].outPorts[src.port] = []
	graph[src.name].outPorts[src.port].push(dst)
	graph[dst.name].inPorts[dst.port] = src
}

function portOutputPort(graph: CircuitGraph, src: { name: string, port: string }, dst: { name: string, port: string }) {
	for(const connection of graph[src.name].outPorts[src.port]) {
		graph[connection.name].inPorts[connection.port] = dst
	}

	graph[dst.name].outPorts[dst.port] = graph[src.name].outPorts[src.port]
}

function reduceClockBuffers(graph: CircuitGraph) {
	const visited: Set<string> = new Set()
	const frontier: string[] = []

	let clockBuffsRemoved = 0

	visited.add('clk')
	frontier.push('clk')

	while(frontier.length > 0) {
		const name = frontier.shift()!

		const node = graph[name]

		if(node.type === 'sky130_fd_sc_hd__clkbuf_16' || node.type === 'sky130_fd_sc_hd__clkbuf_8' || node.type === 'sky130_fd_sc_hd__clkbuf_4') {
			const inputConnection = node.inPorts['A']

			closeConnection(graph, inputConnection, name, node.outPorts['X'] ?? [])
			
			delete graph[name]

			clockBuffsRemoved++
		}
		
		for(const port of Object.keys(node.outPorts)) {
			for(const otherNode of node.outPorts[port]) {
				if(visited.has(otherNode.name)) continue

				visited.add(otherNode.name)
				frontier.push(otherNode.name)
			}
		}
	}

	console.log(`Removed ${clockBuffsRemoved} clock buffs!`)
}

function removeExtraneous(graph: CircuitGraph) {
	const ports = ['success', 'O[0]', 'O[1]', 'O[2]', 'O[3]', 'O[4]', 'O[5]', 'O[6]', 'O[7]']

	const portsServed: Record<string, Set<string>> = {}

	let nodesRemoved = 0

	for(const ioPort of ports) {
		const visited: Set<string> = new Set()
		const frontier: string[] = []

		visited.add(ioPort)
		frontier.push(ioPort)

		while(frontier.length > 0) {
			const name = frontier.shift()!

			const node = graph[name]

			if(!portsServed[name]) portsServed[name] = new Set()
			
			portsServed[name].add(ioPort)

			for(const port of Object.keys(node.inPorts)) {
				if(visited.has(node.inPorts[port].name)) continue

				visited.add(node.inPorts[port].name)
				frontier.push(node.inPorts[port].name)
			}
		}
	}

	const removed = new Set()

	const keys = Object.keys(graph)
	for(const name of keys) {
		if(portsServed[name] && portsServed[name].has('success')) continue 
		
		delete graph[name]

		removed.add(name)
			
		nodesRemoved++
	}


	for(const name of Object.keys(graph)) {
		for(const port of Object.keys(graph[name].outPorts)) {
			graph[name].outPorts[port] = graph[name].outPorts[port].filter(connection => !removed.has(connection.name))
		}
	}

	console.log(`Removed ${nodesRemoved} extra nodes!`)
}

function reduceRegisters(graph: CircuitGraph) {
	let registersInferred = 0
	
	const clockConnections = JSON.parse(JSON.stringify(graph['clk'].outPorts['clk']))
	for(const connection of clockConnections) {
		const name = connection.name
		const node = graph[name]

		const inputLockName = node.inPorts['D'].name
		const inputLockNode = graph[inputLockName]

		if(inputLockNode.type !== 'sky130_fd_sc_hd__mux2_1' || inputLockNode.inPorts['A0'].name !== name || !node.outPorts['Q'].some(otherConnection => otherConnection.name === inputLockName)) {
			// console.warn(`Possible register didn't match recursive mux pattern ${name}!`)
			
			continue
		}

		const registerName = `register_${registersInferred}`

		graph[registerName] = {
			type: 'register',
			inPorts: {
				'reset_n': node.inPorts['RESET_B'],
				'clk': node.inPorts['CLK'],
				'next': graph[inputLockName].inPorts['A1'],
				'enable': graph[inputLockName].inPorts['S'],
			},
			outPorts: {
				'value': node.outPorts['Q'].filter(otherConnection => otherConnection.name !== inputLockName)
			}
		}

		closeConnection(graph, graph[inputLockName].inPorts['A1'], inputLockName, [{ name: registerName, port: 'next' }])
		
		closeConnection(graph, graph[inputLockName].inPorts['S'], inputLockName, [{ name: registerName, port: 'enable' }])

		closeConnection(graph, node.inPorts['RESET_B'], name, [{ name: registerName, port: 'reset_n' }])
		
		closeConnection(graph, node.inPorts['CLK'], name, [{ name: registerName, port: 'clk' }])
		
		closeConnection(graph, { name: `register_${registersInferred}`, port: 'value' }, name, node.outPorts['Q'].filter(otherConnection => otherConnection.name !== inputLockName))

		delete graph[name]
		delete graph[inputLockName]

		registersInferred++
	}

	console.log(`Inferred ${registersInferred} registers!`)
}

function segment(graph: CircuitGraph) {
	const inInstances = [
		'sky130_fd_sc_hd__dfrtp_2_44',
		'sky130_fd_sc_hd__dfrtp_2_43',
		'sky130_fd_sc_hd__dfrtp_2_46',
		'sky130_fd_sc_hd__dfrtp_2_45',
		'sky130_fd_sc_hd__dfrtp_2_15',
		'sky130_fd_sc_hd__dfrtp_2_17',
		'sky130_fd_sc_hd__dfrtp_2_18',
		'sky130_fd_sc_hd__dfrtp_2_16',
	]
	const outInstances = ['sky130_fd_sc_hd__dfrtp_2_1', 'sky130_fd_sc_hd__dfrtp_2_2']

	const instancesServed: Record<string, Set<string>> = {}

	let nodesRemoved = 0

	for(const outInstance of outInstances) {
		const visited: Set<string> = new Set()
		const frontier: string[] = []

		visited.add(outInstance)
		frontier.push(outInstance)

		while(frontier.length > 0) {
			const name = frontier.shift()!

			const node = graph[name]

			if(!instancesServed[name]) instancesServed[name] = new Set()
			
			instancesServed[name].add(outInstance)

			for(const port of Object.keys(node.inPorts)) {
				if(visited.has(node.inPorts[port].name)) continue

				visited.add(node.inPorts[port].name)
				frontier.push(node.inPorts[port].name)
			}
		}
	}

	for(const inInstance of inInstances) {
		const visited: Set<string> = new Set()
		const frontier: string[] = []

		visited.add(inInstance)
		frontier.push(inInstance)

		while(frontier.length > 0) {
			const name = frontier.shift()!

			const node = graph[name]

			if(!instancesServed[name]) instancesServed[name] = new Set()
			
			instancesServed[name].add(inInstance)

			for(const port of Object.keys(node.outPorts)) {
				for(const connection of node.outPorts[port]) {
					if(visited.has(connection.name)) continue

					visited.add(connection.name)
					frontier.push(connection.name)
				}
			}
		}
	}

	const removed = new Set()

	const keys = Object.keys(graph)
	for(const name of keys) {
		if(instancesServed[name] && !inInstances.some(inInstance => !instancesServed[name].has(inInstance)) && !outInstances.some(outInstances => !instancesServed[name].has(outInstances))) continue 
		
		delete graph[name]

		removed.add(name)
			
		nodesRemoved++
	}


	for(const name of Object.keys(graph)) {
		for(const port of Object.keys(graph[name].outPorts)) {
			graph[name].outPorts[port] = graph[name].outPorts[port].filter(connection => !removed.has(connection.name))
		}
	}

	console.log(`Segment pruned ${nodesRemoved} nodes!`)
}

function simplify(graph: CircuitGraph) {
	let reducedGates = 0

	while(true) {
		const targetNode = Object.entries(graph).find(([id, node]) => [
			'sky130_fd_sc_hd__and2b_2',
			'sky130_fd_sc_hd__and3_2',
			'sky130_fd_sc_hd__and3b_2',
			'sky130_fd_sc_hd__and4_2',
			'sky130_fd_sc_hd__and4b_2',
			'sky130_fd_sc_hd__and4bb_2',
			'sky130_fd_sc_hd__or3_2',
			'sky130_fd_sc_hd__or4_2',
			'sky130_fd_sc_hd__or4b_2',
			'sky130_fd_sc_hd__or4bb_2',

			'sky130_fd_sc_hd__nand2_2',
			'sky130_fd_sc_hd__nand2b_2',
			'sky130_fd_sc_hd__nand3_2',
			'sky130_fd_sc_hd__nand3b_2',
			'sky130_fd_sc_hd__nand4_2',
			'sky130_fd_sc_hd__nand4b_2',
			'sky130_fd_sc_hd__nand4bb_2',
			'sky130_fd_sc_hd__nor2_2',
			'sky130_fd_sc_hd__nor3_2',
			'sky130_fd_sc_hd__nor3b_2',
			'sky130_fd_sc_hd__nor4_2',
			'sky130_fd_sc_hd__nor4b_2',
			'sky130_fd_sc_hd__nor4bb_2',
			'sky130_fd_sc_hd__xnor2_2',

			'sky130_fd_sc_hd__a21o_2',
			'sky130_fd_sc_hd__a21bo_2',
			'sky130_fd_sc_hd__a31o_2',
			'sky130_fd_sc_hd__a211o_2',
			'sky130_fd_sc_hd__a22o_2',
			'sky130_fd_sc_hd__a32o_2',
			'sky130_fd_sc_hd__a311o_2',
			'sky130_fd_sc_hd__a221o_2',
			'sky130_fd_sc_hd__o2bb2a_2',
			'sky130_fd_sc_hd__o21a_2',
			'sky130_fd_sc_hd__o21ba_2',
			'sky130_fd_sc_hd__o22a_2',
			'sky130_fd_sc_hd__o211a_2',
			'sky130_fd_sc_hd__o311a_2',
			'sky130_fd_sc_hd__o31a_2',
			'sky130_fd_sc_hd__o221a_2',
			'sky130_fd_sc_hd__o32a_2',
		].includes(node.type))

		if(!targetNode) break

		const [id, node] = targetNode

		if(node.type === 'sky130_fd_sc_hd__and2b_2') {
			graph[`${id}_simplify_and`] = { type: 'sky130_fd_sc_hd__and2_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_and_not`] = { type: 'sky130_fd_sc_hd__inv_2', inPorts: {}, outPorts: {} }

			portInputPort(graph, { name: id, port: 'A_N' }, { name: `${id}_simplify_and_not`, port: 'A' })
			portInputPort(graph, { name: id, port: 'B' }, { name: `${id}_simplify_and`, port: 'B' })

			tiePorts(graph, { name: `${id}_simplify_and_not`, port: 'Y' }, { name: `${id}_simplify_and`, port: 'A' })

			portOutputPort(graph, { name: id, port: 'X' }, { name: `${id}_simplify_and`, port: 'X' })
		}

		if(node.type === 'sky130_fd_sc_hd__and3_2') {
			graph[`${id}_simplify_and`] = { type: 'sky130_fd_sc_hd__and2_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_and2`] = { type: 'sky130_fd_sc_hd__and2_2', inPorts: {}, outPorts: {} }

			portInputPort(graph, { name: id, port: 'A' }, { name: `${id}_simplify_and`, port: 'A' })
			portInputPort(graph, { name: id, port: 'B' }, { name: `${id}_simplify_and`, port: 'B' })
			portInputPort(graph, { name: id, port: 'C' }, { name: `${id}_simplify_and2`, port: 'B' })

			tiePorts(graph, { name: `${id}_simplify_and`, port: 'X' }, { name: `${id}_simplify_and2`, port: 'A' })

			portOutputPort(graph, { name: id, port: 'X' }, { name: `${id}_simplify_and2`, port: 'X' })
		}

		if(node.type === 'sky130_fd_sc_hd__and3b_2') {
			graph[`${id}_simplify_and`] = { type: 'sky130_fd_sc_hd__and2_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_and2`] = { type: 'sky130_fd_sc_hd__and2_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_and_not`] = { type: 'sky130_fd_sc_hd__inv_2', inPorts: {}, outPorts: {} }

			portInputPort(graph, { name: id, port: 'A_N' }, { name: `${id}_simplify_and_not`, port: 'A' })
			portInputPort(graph, { name: id, port: 'B' }, { name: `${id}_simplify_and`, port: 'B' })
			portInputPort(graph, { name: id, port: 'C' }, { name: `${id}_simplify_and2`, port: 'B' })

			tiePorts(graph, { name: `${id}_simplify_and`, port: 'X' }, { name: `${id}_simplify_and2`, port: 'A' })
			tiePorts(graph, { name: `${id}_simplify_and_not`, port: 'Y' }, { name: `${id}_simplify_and`, port: 'A' })

			portOutputPort(graph, { name: id, port: 'X' }, { name: `${id}_simplify_and2`, port: 'X' })
		}

		if(node.type === 'sky130_fd_sc_hd__and4_2') {
			graph[`${id}_simplify_and`] = { type: 'sky130_fd_sc_hd__and2_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_and2`] = { type: 'sky130_fd_sc_hd__and2_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_and3`] = { type: 'sky130_fd_sc_hd__and2_2', inPorts: {}, outPorts: {} }

			portInputPort(graph, { name: id, port: 'A' }, { name: `${id}_simplify_and`, port: 'A' })
			portInputPort(graph, { name: id, port: 'B' }, { name: `${id}_simplify_and`, port: 'B' })
			portInputPort(graph, { name: id, port: 'C' }, { name: `${id}_simplify_and2`, port: 'B' })
			portInputPort(graph, { name: id, port: 'D' }, { name: `${id}_simplify_and2`, port: 'B' })

			tiePorts(graph, { name: `${id}_simplify_and`, port: 'X' }, { name: `${id}_simplify_and3`, port: 'A' })
			tiePorts(graph, { name: `${id}_simplify_and2`, port: 'X' }, { name: `${id}_simplify_and3`, port: 'B' })

			portOutputPort(graph, { name: id, port: 'X' }, { name: `${id}_simplify_and3`, port: 'X' })
		}

		if(node.type === 'sky130_fd_sc_hd__and4b_2') {
			graph[`${id}_simplify_and`] = { type: 'sky130_fd_sc_hd__and2_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_and2`] = { type: 'sky130_fd_sc_hd__and2_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_and3`] = { type: 'sky130_fd_sc_hd__and2_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_and_not`] = { type: 'sky130_fd_sc_hd__inv_2', inPorts: {}, outPorts: {} }

			portInputPort(graph, { name: id, port: 'A_N' }, { name: `${id}_simplify_and_not`, port: 'A' })
			portInputPort(graph, { name: id, port: 'B' }, { name: `${id}_simplify_and`, port: 'B' })
			portInputPort(graph, { name: id, port: 'C' }, { name: `${id}_simplify_and2`, port: 'B' })
			portInputPort(graph, { name: id, port: 'D' }, { name: `${id}_simplify_and2`, port: 'B' })

			tiePorts(graph, { name: `${id}_simplify_and_not`, port: 'Y' }, { name: `${id}_simplify_and`, port: 'A' })
			tiePorts(graph, { name: `${id}_simplify_and`, port: 'X' }, { name: `${id}_simplify_and3`, port: 'A' })
			tiePorts(graph, { name: `${id}_simplify_and2`, port: 'X' }, { name: `${id}_simplify_and3`, port: 'B' })

			portOutputPort(graph, { name: id, port: 'X' }, { name: `${id}_simplify_and3`, port: 'X' })
		}

		if(node.type === 'sky130_fd_sc_hd__and4bb_2') {
			graph[`${id}_simplify_and`] = { type: 'sky130_fd_sc_hd__and2_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_and2`] = { type: 'sky130_fd_sc_hd__and2_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_and3`] = { type: 'sky130_fd_sc_hd__and2_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_and_not`] = { type: 'sky130_fd_sc_hd__inv_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_and_not2`] = { type: 'sky130_fd_sc_hd__inv_2', inPorts: {}, outPorts: {} }

			portInputPort(graph, { name: id, port: 'A_N' }, { name: `${id}_simplify_and_not`, port: 'A' })
			portInputPort(graph, { name: id, port: 'B_N' }, { name: `${id}_simplify_and_not2`, port: 'B' })
			portInputPort(graph, { name: id, port: 'C' }, { name: `${id}_simplify_and2`, port: 'B' })
			portInputPort(graph, { name: id, port: 'D' }, { name: `${id}_simplify_and2`, port: 'B' })

			tiePorts(graph, { name: `${id}_simplify_and_not`, port: 'Y' }, { name: `${id}_simplify_and`, port: 'A' })
			tiePorts(graph, { name: `${id}_simplify_and_not2`, port: 'Y' }, { name: `${id}_simplify_and`, port: 'B' })
			tiePorts(graph, { name: `${id}_simplify_and`, port: 'X' }, { name: `${id}_simplify_and3`, port: 'A' })
			tiePorts(graph, { name: `${id}_simplify_and2`, port: 'X' }, { name: `${id}_simplify_and3`, port: 'B' })

			portOutputPort(graph, { name: id, port: 'X' }, { name: `${id}_simplify_and3`, port: 'X' })
		}

		if(node.type === 'sky130_fd_sc_hd__or3_2') {
			graph[`${id}_simplify_or`] = { type: 'sky130_fd_sc_hd__or2_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_or2`] = { type: 'sky130_fd_sc_hd__or2_2', inPorts: {}, outPorts: {} }

			portInputPort(graph, { name: id, port: 'A' }, { name: `${id}_simplify_or`, port: 'A' })
			portInputPort(graph, { name: id, port: 'B' }, { name: `${id}_simplify_or`, port: 'B' })
			portInputPort(graph, { name: id, port: 'C' }, { name: `${id}_simplify_or2`, port: 'B' })

			tiePorts(graph, { name: `${id}_simplify_or`, port: 'X' }, { name: `${id}_simplify_or2`, port: 'A' })

			portOutputPort(graph, { name: id, port: 'X' }, { name: `${id}_simplify_or2`, port: 'X' })
		}

		if(node.type === 'sky130_fd_sc_hd__or3b_2') {
			throw new Error('Unhandled!')
		}

		if(node.type === 'sky130_fd_sc_hd__or4_2') {
			graph[`${id}_simplify_or`] = { type: 'sky130_fd_sc_hd__or2_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_or2`] = { type: 'sky130_fd_sc_hd__or2_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_or3`] = { type: 'sky130_fd_sc_hd__or2_2', inPorts: {}, outPorts: {} }

			portInputPort(graph, { name: id, port: 'A' }, { name: `${id}_simplify_or`, port: 'A' })
			portInputPort(graph, { name: id, port: 'B' }, { name: `${id}_simplify_or`, port: 'B' })
			portInputPort(graph, { name: id, port: 'C' }, { name: `${id}_simplify_or2`, port: 'B' })
			portInputPort(graph, { name: id, port: 'D' }, { name: `${id}_simplify_or2`, port: 'B' })

			tiePorts(graph, { name: `${id}_simplify_or`, port: 'X' }, { name: `${id}_simplify_or3`, port: 'A' })
			tiePorts(graph, { name: `${id}_simplify_or2`, port: 'X' }, { name: `${id}_simplify_or3`, port: 'B' })

			portOutputPort(graph, { name: id, port: 'X' }, { name: `${id}_simplify_or3`, port: 'X' })
		}

		if(node.type === 'sky130_fd_sc_hd__or4b_2') {
			graph[`${id}_simplify_or`] = { type: 'sky130_fd_sc_hd__or2_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_or2`] = { type: 'sky130_fd_sc_hd__or2_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_or3`] = { type: 'sky130_fd_sc_hd__or2_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_or_not`] = { type: 'sky130_fd_sc_hd__inv_2', inPorts: {}, outPorts: {} }

			portInputPort(graph, { name: id, port: 'A' }, { name: `${id}_simplify_or`, port: 'A' })
			portInputPort(graph, { name: id, port: 'B' }, { name: `${id}_simplify_or`, port: 'B' })
			portInputPort(graph, { name: id, port: 'C' }, { name: `${id}_simplify_or2`, port: 'B' })
			portInputPort(graph, { name: id, port: 'D_N' }, { name: `${id}_simplify_or_not`, port: 'A' })

			tiePorts(graph, { name: `${id}_simplify_or_not`, port: 'Y' }, { name: `${id}_simplify_or2`, port: 'B' })
			tiePorts(graph, { name: `${id}_simplify_or`, port: 'X' }, { name: `${id}_simplify_or3`, port: 'A' })
			tiePorts(graph, { name: `${id}_simplify_or2`, port: 'X' }, { name: `${id}_simplify_or3`, port: 'B' })

			portOutputPort(graph, { name: id, port: 'X' }, { name: `${id}_simplify_or3`, port: 'X' })
		}

		if(node.type === 'sky130_fd_sc_hd__or4bb_2') {
			graph[`${id}_simplify_or`] = { type: 'sky130_fd_sc_hd__or2_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_or2`] = { type: 'sky130_fd_sc_hd__or2_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_or3`] = { type: 'sky130_fd_sc_hd__or2_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_or_not`] = { type: 'sky130_fd_sc_hd__inv_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_or_not2`] = { type: 'sky130_fd_sc_hd__inv_2', inPorts: {}, outPorts: {} }

			portInputPort(graph, { name: id, port: 'A' }, { name: `${id}_simplify_or`, port: 'A' })
			portInputPort(graph, { name: id, port: 'B' }, { name: `${id}_simplify_or`, port: 'B' })
			portInputPort(graph, { name: id, port: 'C_N' }, { name: `${id}_simplify_or_not`, port: 'A' })
			portInputPort(graph, { name: id, port: 'D_N' }, { name: `${id}_simplify_or_not2`, port: 'A' })

			tiePorts(graph, { name: `${id}_simplify_or_not`, port: 'Y' }, { name: `${id}_simplify_or2`, port: 'A' })
			tiePorts(graph, { name: `${id}_simplify_or_not2`, port: 'Y' }, { name: `${id}_simplify_or2`, port: 'B' })
			tiePorts(graph, { name: `${id}_simplify_or`, port: 'X' }, { name: `${id}_simplify_or3`, port: 'A' })
			tiePorts(graph, { name: `${id}_simplify_or2`, port: 'X' }, { name: `${id}_simplify_or3`, port: 'B' })

			portOutputPort(graph, { name: id, port: 'X' }, { name: `${id}_simplify_or3`, port: 'X' })
		}

		if(node.type === 'sky130_fd_sc_hd__nand2_2') {
			graph[`${id}_simplify_and`] = { type: 'sky130_fd_sc_hd__and2_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_and_not`] = { type: 'sky130_fd_sc_hd__inv_2', inPorts: {}, outPorts: {} }

			portInputPort(graph, { name: id, port: 'A' }, { name: `${id}_simplify_and`, port: 'A' })
			portInputPort(graph, { name: id, port: 'B' }, { name: `${id}_simplify_and`, port: 'B' })

			tiePorts(graph, { name: `${id}_simplify_and`, port: 'X' }, { name: `${id}_simplify_and_not`, port: 'A' })

			portOutputPort(graph, { name: id, port: 'Y' }, { name: `${id}_simplify_and_not`, port: 'Y' })
		}

		if(node.type === 'sky130_fd_sc_hd__nand2b_2') {
			graph[`${id}_simplify_and`] = { type: 'sky130_fd_sc_hd__and2b_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_and_not`] = { type: 'sky130_fd_sc_hd__inv_2', inPorts: {}, outPorts: {} }

			portInputPort(graph, { name: id, port: 'A_N' }, { name: `${id}_simplify_and`, port: 'A_N' })
			portInputPort(graph, { name: id, port: 'B' }, { name: `${id}_simplify_and`, port: 'B' })

			tiePorts(graph, { name: `${id}_simplify_and`, port: 'X' }, { name: `${id}_simplify_and_not`, port: 'A' })

			portOutputPort(graph, { name: id, port: 'Y' }, { name: `${id}_simplify_and_not`, port: 'Y' })
		}

		if(node.type === 'sky130_fd_sc_hd__nand3_2') {
			graph[`${id}_simplify_and`] = { type: 'sky130_fd_sc_hd__and3_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_and_not`] = { type: 'sky130_fd_sc_hd__inv_2', inPorts: {}, outPorts: {} }

			portInputPort(graph, { name: id, port: 'A' }, { name: `${id}_simplify_and`, port: 'A' })
			portInputPort(graph, { name: id, port: 'B' }, { name: `${id}_simplify_and`, port: 'B' })
			portInputPort(graph, { name: id, port: 'C' }, { name: `${id}_simplify_and`, port: 'C' })

			tiePorts(graph, { name: `${id}_simplify_and`, port: 'X' }, { name: `${id}_simplify_and_not`, port: 'A' })

			portOutputPort(graph, { name: id, port: 'Y' }, { name: `${id}_simplify_and_not`, port: 'Y' })
		}

		if(node.type === 'sky130_fd_sc_hd__nand3b_2') {
			graph[`${id}_simplify_and`] = { type: 'sky130_fd_sc_hd__and3b_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_and_not`] = { type: 'sky130_fd_sc_hd__inv_2', inPorts: {}, outPorts: {} }

			portInputPort(graph, { name: id, port: 'A_N' }, { name: `${id}_simplify_and`, port: 'A_N' })
			portInputPort(graph, { name: id, port: 'B' }, { name: `${id}_simplify_and`, port: 'B' })
			portInputPort(graph, { name: id, port: 'C' }, { name: `${id}_simplify_and`, port: 'C' })

			tiePorts(graph, { name: `${id}_simplify_and`, port: 'X' }, { name: `${id}_simplify_and_not`, port: 'A' })

			portOutputPort(graph, { name: id, port: 'Y' }, { name: `${id}_simplify_and_not`, port: 'Y' })
		}

		if(node.type === 'sky130_fd_sc_hd__nand4_2') {
			graph[`${id}_simplify_and`] = { type: 'sky130_fd_sc_hd__and4_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_and_not`] = { type: 'sky130_fd_sc_hd__inv_2', inPorts: {}, outPorts: {} }

			portInputPort(graph, { name: id, port: 'A' }, { name: `${id}_simplify_and`, port: 'A' })
			portInputPort(graph, { name: id, port: 'B' }, { name: `${id}_simplify_and`, port: 'B' })
			portInputPort(graph, { name: id, port: 'C' }, { name: `${id}_simplify_and`, port: 'C' })
			portInputPort(graph, { name: id, port: 'D' }, { name: `${id}_simplify_and`, port: 'D' })

			tiePorts(graph, { name: `${id}_simplify_and`, port: 'X' }, { name: `${id}_simplify_and_not`, port: 'A' })

			portOutputPort(graph, { name: id, port: 'Y' }, { name: `${id}_simplify_and_not`, port: 'Y' })
		}

		if(node.type === 'sky130_fd_sc_hd__nand4b_2') {
			graph[`${id}_simplify_and`] = { type: 'sky130_fd_sc_hd__and4b_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_and_not`] = { type: 'sky130_fd_sc_hd__inv_2', inPorts: {}, outPorts: {} }

			portInputPort(graph, { name: id, port: 'A_N' }, { name: `${id}_simplify_and`, port: 'A_N' })
			portInputPort(graph, { name: id, port: 'B' }, { name: `${id}_simplify_and`, port: 'B' })
			portInputPort(graph, { name: id, port: 'C' }, { name: `${id}_simplify_and`, port: 'C' })
			portInputPort(graph, { name: id, port: 'D' }, { name: `${id}_simplify_and`, port: 'D' })

			tiePorts(graph, { name: `${id}_simplify_and`, port: 'X' }, { name: `${id}_simplify_and_not`, port: 'A' })

			portOutputPort(graph, { name: id, port: 'Y' }, { name: `${id}_simplify_and_not`, port: 'Y' })
		}

		if(node.type === 'sky130_fd_sc_hd__nand4bb_2') {
			graph[`${id}_simplify_and`] = { type: 'sky130_fd_sc_hd__and4bb_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_and_not`] = { type: 'sky130_fd_sc_hd__inv_2', inPorts: {}, outPorts: {} }

			portInputPort(graph, { name: id, port: 'A_N' }, { name: `${id}_simplify_and`, port: 'A_N' })
			portInputPort(graph, { name: id, port: 'B_N' }, { name: `${id}_simplify_and`, port: 'B_N' })
			portInputPort(graph, { name: id, port: 'C' }, { name: `${id}_simplify_and`, port: 'C' })
			portInputPort(graph, { name: id, port: 'D' }, { name: `${id}_simplify_and`, port: 'D' })

			tiePorts(graph, { name: `${id}_simplify_and`, port: 'X' }, { name: `${id}_simplify_and_not`, port: 'A' })

			portOutputPort(graph, { name: id, port: 'Y' }, { name: `${id}_simplify_and_not`, port: 'Y' })
		}

		if(node.type === 'sky130_fd_sc_hd__nor2_2') {
			graph[`${id}_simplify_or`] = { type: 'sky130_fd_sc_hd__or2_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_or_not`] = { type: 'sky130_fd_sc_hd__inv_2', inPorts: {}, outPorts: {} }

			portInputPort(graph, { name: id, port: 'A' }, { name: `${id}_simplify_or`, port: 'A' })
			portInputPort(graph, { name: id, port: 'B' }, { name: `${id}_simplify_or`, port: 'B' })

			tiePorts(graph, { name: `${id}_simplify_or`, port: 'X' }, { name: `${id}_simplify_or_not`, port: 'A' })

			portOutputPort(graph, { name: id, port: 'Y' }, { name: `${id}_simplify_or_not`, port: 'Y' })
		}

		if(node.type === 'sky130_fd_sc_hd__nor3_2') {
			graph[`${id}_simplify_or`] = { type: 'sky130_fd_sc_hd__or3_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_or_not`] = { type: 'sky130_fd_sc_hd__inv_2', inPorts: {}, outPorts: {} }

			portInputPort(graph, { name: id, port: 'A' }, { name: `${id}_simplify_or`, port: 'A' })
			portInputPort(graph, { name: id, port: 'B' }, { name: `${id}_simplify_or`, port: 'B' })
			portInputPort(graph, { name: id, port: 'C' }, { name: `${id}_simplify_or`, port: 'C' })

			tiePorts(graph, { name: `${id}_simplify_or`, port: 'X' }, { name: `${id}_simplify_or_not`, port: 'A' })

			portOutputPort(graph, { name: id, port: 'Y' }, { name: `${id}_simplify_or_not`, port: 'Y' })
		}

		if(node.type === 'sky130_fd_sc_hd__nor3b_2') {
			graph[`${id}_simplify_or`] = { type: 'sky130_fd_sc_hd__or3b_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_or_not`] = { type: 'sky130_fd_sc_hd__inv_2', inPorts: {}, outPorts: {} }

			portInputPort(graph, { name: id, port: 'A' }, { name: `${id}_simplify_or`, port: 'A' })
			portInputPort(graph, { name: id, port: 'B' }, { name: `${id}_simplify_or`, port: 'B' })
			portInputPort(graph, { name: id, port: 'C_N' }, { name: `${id}_simplify_or`, port: 'C_N' })

			tiePorts(graph, { name: `${id}_simplify_or`, port: 'X' }, { name: `${id}_simplify_or_not`, port: 'A' })

			portOutputPort(graph, { name: id, port: 'Y' }, { name: `${id}_simplify_or_not`, port: 'Y' })
		}

		if(node.type === 'sky130_fd_sc_hd__nor4_2') {
			graph[`${id}_simplify_or`] = { type: 'sky130_fd_sc_hd__or4_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_or_not`] = { type: 'sky130_fd_sc_hd__inv_2', inPorts: {}, outPorts: {} }

			portInputPort(graph, { name: id, port: 'A' }, { name: `${id}_simplify_or`, port: 'A' })
			portInputPort(graph, { name: id, port: 'B' }, { name: `${id}_simplify_or`, port: 'B' })
			portInputPort(graph, { name: id, port: 'C' }, { name: `${id}_simplify_or`, port: 'C' })
			portInputPort(graph, { name: id, port: 'D' }, { name: `${id}_simplify_or`, port: 'D' })

			tiePorts(graph, { name: `${id}_simplify_or`, port: 'X' }, { name: `${id}_simplify_or_not`, port: 'A' })

			portOutputPort(graph, { name: id, port: 'Y' }, { name: `${id}_simplify_or_not`, port: 'Y' })
		}

		if(node.type === 'sky130_fd_sc_hd__nor4b_2') {
			graph[`${id}_simplify_or`] = { type: 'sky130_fd_sc_hd__or4b_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_or_not`] = { type: 'sky130_fd_sc_hd__inv_2', inPorts: {}, outPorts: {} }

			portInputPort(graph, { name: id, port: 'A' }, { name: `${id}_simplify_or`, port: 'A' })
			portInputPort(graph, { name: id, port: 'B' }, { name: `${id}_simplify_or`, port: 'B' })
			portInputPort(graph, { name: id, port: 'C' }, { name: `${id}_simplify_or`, port: 'C' })
			portInputPort(graph, { name: id, port: 'D_N' }, { name: `${id}_simplify_or`, port: 'D_N' })

			tiePorts(graph, { name: `${id}_simplify_or`, port: 'X' }, { name: `${id}_simplify_or_not`, port: 'A' })

			portOutputPort(graph, { name: id, port: 'Y' }, { name: `${id}_simplify_or_not`, port: 'Y' })
		}

		if(node.type === 'sky130_fd_sc_hd__nor4bb_2') {
			graph[`${id}_simplify_or`] = { type: 'sky130_fd_sc_hd__or4bb_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_or_not`] = { type: 'sky130_fd_sc_hd__inv_2', inPorts: {}, outPorts: {} }

			portInputPort(graph, { name: id, port: 'A' }, { name: `${id}_simplify_or`, port: 'A' })
			portInputPort(graph, { name: id, port: 'B' }, { name: `${id}_simplify_or`, port: 'B' })
			portInputPort(graph, { name: id, port: 'C_N' }, { name: `${id}_simplify_or`, port: 'C_N' })
			portInputPort(graph, { name: id, port: 'D_N' }, { name: `${id}_simplify_or`, port: 'D_N' })

			tiePorts(graph, { name: `${id}_simplify_or`, port: 'X' }, { name: `${id}_simplify_or_not`, port: 'A' })

			portOutputPort(graph, { name: id, port: 'Y' }, { name: `${id}_simplify_or_not`, port: 'Y' })
		}

		if(node.type === 'sky130_fd_sc_hd__xnor2_2') {
			graph[`${id}_simplify_xor`] = { type: 'sky130_fd_sc_hd__xor2_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_xor_not`] = { type: 'sky130_fd_sc_hd__inv_2', inPorts: {}, outPorts: {} }

			portInputPort(graph, { name: id, port: 'A' }, { name: `${id}_simplify_xor`, port: 'A' })
			portInputPort(graph, { name: id, port: 'B' }, { name: `${id}_simplify_xor`, port: 'B' })

			tiePorts(graph, { name: `${id}_simplify_xor`, port: 'X' }, { name: `${id}_simplify_xor_not`, port: 'A' })

			portOutputPort(graph, { name: id, port: 'Y' }, { name: `${id}_simplify_xor_not`, port: 'Y' })
		}

		if(node.type === 'sky130_fd_sc_hd__a21o_2') {
			graph[`${id}_simplify_and`] = { type: 'sky130_fd_sc_hd__and2_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_or`] = { type: 'sky130_fd_sc_hd__or2_2', inPorts: {}, outPorts: {} }

			portInputPort(graph, { name: id, port: 'A1' }, { name: `${id}_simplify_and`, port: 'A' })
			portInputPort(graph, { name: id, port: 'A2' }, { name: `${id}_simplify_and`, port: 'B' })
			portInputPort(graph, { name: id, port: 'B1' }, { name: `${id}_simplify_or`, port: 'B' })

			tiePorts(graph, { name: `${id}_simplify_and`, port: 'X' }, { name: `${id}_simplify_or`, port: 'A' })

			portOutputPort(graph, { name: id, port: 'X' }, { name: `${id}_simplify_or`, port: 'X' })
		}

		if(node.type === 'sky130_fd_sc_hd__a21bo_2') {
			graph[`${id}_simplify_and`] = { type: 'sky130_fd_sc_hd__and2_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_or`] = { type: 'sky130_fd_sc_hd__or2_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_not`] = { type: 'sky130_fd_sc_hd__inv_2', inPorts: {}, outPorts: {} }

			portInputPort(graph, { name: id, port: 'A1' }, { name: `${id}_simplify_and`, port: 'A' })
			portInputPort(graph, { name: id, port: 'A2' }, { name: `${id}_simplify_and`, port: 'B' })
			portInputPort(graph, { name: id, port: 'B1_N' }, { name: `${id}_simplify_not`, port: 'A' })

			tiePorts(graph, { name: `${id}_simplify_and`, port: 'X' }, { name: `${id}_simplify_or`, port: 'A' })
			tiePorts(graph, { name: `${id}_simplify_not`, port: 'Y' }, { name: `${id}_simplify_or`, port: 'B' })

			portOutputPort(graph, { name: id, port: 'X' }, { name: `${id}_simplify_or`, port: 'X' })
		}

		if(node.type === 'sky130_fd_sc_hd__a31o_2') {
			graph[`${id}_simplify_and`] = { type: 'sky130_fd_sc_hd__and3_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_or`] = { type: 'sky130_fd_sc_hd__or2_2', inPorts: {}, outPorts: {} }

			portInputPort(graph, { name: id, port: 'A1' }, { name: `${id}_simplify_and`, port: 'A' })
			portInputPort(graph, { name: id, port: 'A2' }, { name: `${id}_simplify_and`, port: 'B' })
			portInputPort(graph, { name: id, port: 'A3' }, { name: `${id}_simplify_and`, port: 'C' })
			portInputPort(graph, { name: id, port: 'B1' }, { name: `${id}_simplify_or`, port: 'B' })

			tiePorts(graph, { name: `${id}_simplify_and`, port: 'X' }, { name: `${id}_simplify_or`, port: 'A' })

			portOutputPort(graph, { name: id, port: 'X' }, { name: `${id}_simplify_or`, port: 'X' })
		}

		if(node.type === 'sky130_fd_sc_hd__a211o_2') {
			graph[`${id}_simplify_and`] = { type: 'sky130_fd_sc_hd__and2_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_or`] = { type: 'sky130_fd_sc_hd__or3_2', inPorts: {}, outPorts: {} }

			portInputPort(graph, { name: id, port: 'A1' }, { name: `${id}_simplify_and`, port: 'A' })
			portInputPort(graph, { name: id, port: 'A2' }, { name: `${id}_simplify_and`, port: 'B' })
			portInputPort(graph, { name: id, port: 'B1' }, { name: `${id}_simplify_or`, port: 'B' })
			portInputPort(graph, { name: id, port: 'C1' }, { name: `${id}_simplify_or`, port: 'C' })

			tiePorts(graph, { name: `${id}_simplify_and`, port: 'X' }, { name: `${id}_simplify_or`, port: 'A' })

			portOutputPort(graph, { name: id, port: 'X' }, { name: `${id}_simplify_or`, port: 'X' })
		}

		if(node.type === 'sky130_fd_sc_hd__a22o_2') {
			graph[`${id}_simplify_and`] = { type: 'sky130_fd_sc_hd__and2_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_and2`] = { type: 'sky130_fd_sc_hd__and2_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_or`] = { type: 'sky130_fd_sc_hd__or2_2', inPorts: {}, outPorts: {} }

			portInputPort(graph, { name: id, port: 'A1' }, { name: `${id}_simplify_and`, port: 'A' })
			portInputPort(graph, { name: id, port: 'A2' }, { name: `${id}_simplify_and`, port: 'B' })
			portInputPort(graph, { name: id, port: 'B1' }, { name: `${id}_simplify_and2`, port: 'A' })
			portInputPort(graph, { name: id, port: 'B2' }, { name: `${id}_simplify_and2`, port: 'B' })

			tiePorts(graph, { name: `${id}_simplify_and`, port: 'X' }, { name: `${id}_simplify_or`, port: 'A' })
			tiePorts(graph, { name: `${id}_simplify_and2`, port: 'X' }, { name: `${id}_simplify_or`, port: 'B' })

			portOutputPort(graph, { name: id, port: 'X' }, { name: `${id}_simplify_or`, port: 'X' })
		}

		if(node.type === 'sky130_fd_sc_hd__a32o_2') {
			graph[`${id}_simplify_and`] = { type: 'sky130_fd_sc_hd__and3_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_and2`] = { type: 'sky130_fd_sc_hd__and2_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_or`] = { type: 'sky130_fd_sc_hd__or2_2', inPorts: {}, outPorts: {} }

			portInputPort(graph, { name: id, port: 'A1' }, { name: `${id}_simplify_and`, port: 'A' })
			portInputPort(graph, { name: id, port: 'A2' }, { name: `${id}_simplify_and`, port: 'B' })
			portInputPort(graph, { name: id, port: 'A3' }, { name: `${id}_simplify_and`, port: 'C' })
			portInputPort(graph, { name: id, port: 'B1' }, { name: `${id}_simplify_and2`, port: 'A' })
			portInputPort(graph, { name: id, port: 'B2' }, { name: `${id}_simplify_and2`, port: 'B' })

			tiePorts(graph, { name: `${id}_simplify_and`, port: 'X' }, { name: `${id}_simplify_or`, port: 'A' })
			tiePorts(graph, { name: `${id}_simplify_and2`, port: 'X' }, { name: `${id}_simplify_or`, port: 'B' })

			portOutputPort(graph, { name: id, port: 'X' }, { name: `${id}_simplify_or`, port: 'X' })
		}

		if(node.type === 'sky130_fd_sc_hd__a311o_2') {
			graph[`${id}_simplify_and`] = { type: 'sky130_fd_sc_hd__and3_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_or`] = { type: 'sky130_fd_sc_hd__or3_2', inPorts: {}, outPorts: {} }

			portInputPort(graph, { name: id, port: 'A1' }, { name: `${id}_simplify_and`, port: 'A' })
			portInputPort(graph, { name: id, port: 'A2' }, { name: `${id}_simplify_and`, port: 'B' })
			portInputPort(graph, { name: id, port: 'A3' }, { name: `${id}_simplify_and`, port: 'C' })
			portInputPort(graph, { name: id, port: 'B1' }, { name: `${id}_simplify_or`, port: 'B' })
			portInputPort(graph, { name: id, port: 'C1' }, { name: `${id}_simplify_or`, port: 'C' })

			tiePorts(graph, { name: `${id}_simplify_and`, port: 'X' }, { name: `${id}_simplify_or`, port: 'A' })

			portOutputPort(graph, { name: id, port: 'X' }, { name: `${id}_simplify_or`, port: 'X' })
		}

		if(node.type === 'sky130_fd_sc_hd__a221o_2') {
			graph[`${id}_simplify_and`] = { type: 'sky130_fd_sc_hd__and2_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_and2`] = { type: 'sky130_fd_sc_hd__and2_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_or`] = { type: 'sky130_fd_sc_hd__or3_2', inPorts: {}, outPorts: {} }

			portInputPort(graph, { name: id, port: 'A1' }, { name: `${id}_simplify_and`, port: 'A' })
			portInputPort(graph, { name: id, port: 'A2' }, { name: `${id}_simplify_and`, port: 'B' })
			portInputPort(graph, { name: id, port: 'B1' }, { name: `${id}_simplify_and2`, port: 'A' })
			portInputPort(graph, { name: id, port: 'B2' }, { name: `${id}_simplify_and2`, port: 'B' })
			portInputPort(graph, { name: id, port: 'C1' }, { name: `${id}_simplify_or`, port: 'C' })

			tiePorts(graph, { name: `${id}_simplify_and`, port: 'X' }, { name: `${id}_simplify_or`, port: 'A' })
			tiePorts(graph, { name: `${id}_simplify_and2`, port: 'X' }, { name: `${id}_simplify_or`, port: 'B' })

			portOutputPort(graph, { name: id, port: 'X' }, { name: `${id}_simplify_or`, port: 'X' })
		}

		if(node.type === 'sky130_fd_sc_hd__o2bb2a_2') {
			graph[`${id}_simplify_or`] = { type: 'sky130_fd_sc_hd__or2_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_or2`] = { type: 'sky130_fd_sc_hd__or2_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_and`] = { type: 'sky130_fd_sc_hd__and2_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_not`] = { type: 'sky130_fd_sc_hd__inv_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_not2`] = { type: 'sky130_fd_sc_hd__inv_2', inPorts: {}, outPorts: {} }

			portInputPort(graph, { name: id, port: 'A1_N' }, { name: `${id}_simplify_not`, port: 'A' })
			portInputPort(graph, { name: id, port: 'A2_N' }, { name: `${id}_simplify_not2`, port: 'A' })
			portInputPort(graph, { name: id, port: 'B1' }, { name: `${id}_simplify_or2`, port: 'A' })
			portInputPort(graph, { name: id, port: 'B2' }, { name: `${id}_simplify_or2`, port: 'B' })

			tiePorts(graph, { name: `${id}_simplify_not`, port: 'Y' }, { name: `${id}_simplify_or`, port: 'A' })
			tiePorts(graph, { name: `${id}_simplify_not2`, port: 'Y' }, { name: `${id}_simplify_or`, port: 'B' })
			tiePorts(graph, { name: `${id}_simplify_or`, port: 'X' }, { name: `${id}_simplify_and`, port: 'A' })
			tiePorts(graph, { name: `${id}_simplify_or2`, port: 'X' }, { name: `${id}_simplify_and`, port: 'B' })

			portOutputPort(graph, { name: id, port: 'X' }, { name: `${id}_simplify_and`, port: 'X' })
		}

		if(node.type === 'sky130_fd_sc_hd__o21a_2') {
			graph[`${id}_simplify_or`] = { type: 'sky130_fd_sc_hd__or2_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_and`] = { type: 'sky130_fd_sc_hd__and2_2', inPorts: {}, outPorts: {} }

			portInputPort(graph, { name: id, port: 'A1' }, { name: `${id}_simplify_or`, port: 'A' })
			portInputPort(graph, { name: id, port: 'A2' }, { name: `${id}_simplify_or`, port: 'B' })
			portInputPort(graph, { name: id, port: 'B1' }, { name: `${id}_simplify_and`, port: 'B' })

			tiePorts(graph, { name: `${id}_simplify_or`, port: 'X' }, { name: `${id}_simplify_and`, port: 'A' })

			portOutputPort(graph, { name: id, port: 'X' }, { name: `${id}_simplify_and`, port: 'X' })
		}

		if(node.type === 'sky130_fd_sc_hd__o21ba_2') {
			graph[`${id}_simplify_or`] = { type: 'sky130_fd_sc_hd__or2_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_and`] = { type: 'sky130_fd_sc_hd__and2_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_not`] = { type: 'sky130_fd_sc_hd__inv_2', inPorts: {}, outPorts: {} }

			portInputPort(graph, { name: id, port: 'A1' }, { name: `${id}_simplify_or`, port: 'A' })
			portInputPort(graph, { name: id, port: 'A2' }, { name: `${id}_simplify_or`, port: 'B' })
			portInputPort(graph, { name: id, port: 'B1_N' }, { name: `${id}_simplify_not`, port: 'A' })

			tiePorts(graph, { name: `${id}_simplify_or`, port: 'X' }, { name: `${id}_simplify_and`, port: 'A' })
			tiePorts(graph, { name: `${id}_simplify_not`, port: 'Y' }, { name: `${id}_simplify_or`, port: 'B' })

			portOutputPort(graph, { name: id, port: 'X' }, { name: `${id}_simplify_and`, port: 'X' })
		}

		if(node.type === 'sky130_fd_sc_hd__o22a_2') {
			graph[`${id}_simplify_or`] = { type: 'sky130_fd_sc_hd__or2_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_or2`] = { type: 'sky130_fd_sc_hd__or2_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_and`] = { type: 'sky130_fd_sc_hd__and2_2', inPorts: {}, outPorts: {} }

			portInputPort(graph, { name: id, port: 'A1' }, { name: `${id}_simplify_or`, port: 'A' })
			portInputPort(graph, { name: id, port: 'A2' }, { name: `${id}_simplify_or`, port: 'B' })
			portInputPort(graph, { name: id, port: 'B1' }, { name: `${id}_simplify_or2`, port: 'A' })
			portInputPort(graph, { name: id, port: 'B2' }, { name: `${id}_simplify_or2`, port: 'B' })

			tiePorts(graph, { name: `${id}_simplify_or`, port: 'X' }, { name: `${id}_simplify_and`, port: 'A' })
			tiePorts(graph, { name: `${id}_simplify_or2`, port: 'X' }, { name: `${id}_simplify_and`, port: 'B' })

			portOutputPort(graph, { name: id, port: 'X' }, { name: `${id}_simplify_and`, port: 'X' })
		}

		if(node.type === 'sky130_fd_sc_hd__o211a_2') {
			graph[`${id}_simplify_or`] = { type: 'sky130_fd_sc_hd__or2_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_and`] = { type: 'sky130_fd_sc_hd__and3_2', inPorts: {}, outPorts: {} }

			portInputPort(graph, { name: id, port: 'A1' }, { name: `${id}_simplify_or`, port: 'A' })
			portInputPort(graph, { name: id, port: 'A2' }, { name: `${id}_simplify_or`, port: 'B' })
			portInputPort(graph, { name: id, port: 'B1' }, { name: `${id}_simplify_and`, port: 'B' })
			portInputPort(graph, { name: id, port: 'C1' }, { name: `${id}_simplify_and`, port: 'C' })

			tiePorts(graph, { name: `${id}_simplify_or`, port: 'X' }, { name: `${id}_simplify_and`, port: 'A' })

			portOutputPort(graph, { name: id, port: 'X' }, { name: `${id}_simplify_and`, port: 'X' })
		}

		if(node.type === 'sky130_fd_sc_hd__o311a_2') {
			graph[`${id}_simplify_or`] = { type: 'sky130_fd_sc_hd__or3_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_and`] = { type: 'sky130_fd_sc_hd__and3_2', inPorts: {}, outPorts: {} }

			portInputPort(graph, { name: id, port: 'A1' }, { name: `${id}_simplify_or`, port: 'A' })
			portInputPort(graph, { name: id, port: 'A2' }, { name: `${id}_simplify_or`, port: 'B' })
			portInputPort(graph, { name: id, port: 'A3' }, { name: `${id}_simplify_or`, port: 'C' })
			portInputPort(graph, { name: id, port: 'B1' }, { name: `${id}_simplify_and`, port: 'B' })
			portInputPort(graph, { name: id, port: 'C1' }, { name: `${id}_simplify_and`, port: 'C' })

			tiePorts(graph, { name: `${id}_simplify_or`, port: 'X' }, { name: `${id}_simplify_and`, port: 'A' })

			portOutputPort(graph, { name: id, port: 'X' }, { name: `${id}_simplify_and`, port: 'X' })
		}

		if(node.type === 'sky130_fd_sc_hd__o31a_2') {
			graph[`${id}_simplify_or`] = { type: 'sky130_fd_sc_hd__or3_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_and`] = { type: 'sky130_fd_sc_hd__and2_2', inPorts: {}, outPorts: {} }

			portInputPort(graph, { name: id, port: 'A1' }, { name: `${id}_simplify_or`, port: 'A' })
			portInputPort(graph, { name: id, port: 'A2' }, { name: `${id}_simplify_or`, port: 'B' })
			portInputPort(graph, { name: id, port: 'A3' }, { name: `${id}_simplify_or`, port: 'C' })
			portInputPort(graph, { name: id, port: 'B1' }, { name: `${id}_simplify_and`, port: 'B' })

			tiePorts(graph, { name: `${id}_simplify_or`, port: 'X' }, { name: `${id}_simplify_and`, port: 'A' })

			portOutputPort(graph, { name: id, port: 'X' }, { name: `${id}_simplify_and`, port: 'X' })
		}

		if(node.type === 'sky130_fd_sc_hd__o221a_2') {
			graph[`${id}_simplify_or`] = { type: 'sky130_fd_sc_hd__or2_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_or2`] = { type: 'sky130_fd_sc_hd__or2_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_and`] = { type: 'sky130_fd_sc_hd__and3_2', inPorts: {}, outPorts: {} }

			portInputPort(graph, { name: id, port: 'A1' }, { name: `${id}_simplify_or`, port: 'A' })
			portInputPort(graph, { name: id, port: 'A2' }, { name: `${id}_simplify_or`, port: 'B' })
			portInputPort(graph, { name: id, port: 'B1' }, { name: `${id}_simplify_or2`, port: 'A' })
			portInputPort(graph, { name: id, port: 'B2' }, { name: `${id}_simplify_or2`, port: 'B' })
			portInputPort(graph, { name: id, port: 'C1' }, { name: `${id}_simplify_and`, port: 'C' })

			tiePorts(graph, { name: `${id}_simplify_or`, port: 'X' }, { name: `${id}_simplify_and`, port: 'A' })
			tiePorts(graph, { name: `${id}_simplify_or2`, port: 'X' }, { name: `${id}_simplify_and`, port: 'B' })

			portOutputPort(graph, { name: id, port: 'X' }, { name: `${id}_simplify_and`, port: 'X' })
		}

		if(node.type === 'sky130_fd_sc_hd__o32a_2') {
			graph[`${id}_simplify_or`] = { type: 'sky130_fd_sc_hd__or3_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_or2`] = { type: 'sky130_fd_sc_hd__or2_2', inPorts: {}, outPorts: {} }
			graph[`${id}_simplify_and`] = { type: 'sky130_fd_sc_hd__and2_2', inPorts: {}, outPorts: {} }

			portInputPort(graph, { name: id, port: 'A1' }, { name: `${id}_simplify_or`, port: 'A' })
			portInputPort(graph, { name: id, port: 'A2' }, { name: `${id}_simplify_or`, port: 'B' })
			portInputPort(graph, { name: id, port: 'A3' }, { name: `${id}_simplify_or`, port: 'C' })
			portInputPort(graph, { name: id, port: 'B1' }, { name: `${id}_simplify_or2`, port: 'A' })
			portInputPort(graph, { name: id, port: 'B2' }, { name: `${id}_simplify_or2`, port: 'B' })

			tiePorts(graph, { name: `${id}_simplify_or`, port: 'X' }, { name: `${id}_simplify_and`, port: 'A' })
			tiePorts(graph, { name: `${id}_simplify_or2`, port: 'X' }, { name: `${id}_simplify_and`, port: 'B' })

			portOutputPort(graph, { name: id, port: 'X' }, { name: `${id}_simplify_and`, port: 'X' })
		}

		delete graph[id]

		reducedGates++
	}

	console.log(`Reduced ${reducedGates} gates!`)
}

function cleanName(name: string) {
	if(name === 'register_10') return 'inputShift_00'
	if(name === 'register_5') return 'inputShift_01_IGNORED'
	if(name === 'register_11') return 'inputShift_02_IGNORED'
	if(name === 'register_7') return 'inputShift_03_IGNORED'
	if(name === 'register_4') return 'inputShift_04_IGNORED'
	if(name === 'register_3') return 'inputShift_05_IGNORED'
	if(name === 'register_6') return 'inputShift_06_IGNORED'
	if(name === 'register_0') return 'inputShift_07_IGNORED'
	if(name === 'register_2') return 'inputShift_08_IGNORED'
	if(name === 'register_1') return 'inputShift_09'
	if(name === 'register_8') return 'inputShift_10'
	if(name === 'register_9') return 'inputShift_11'

	if(name === 'sky130_fd_sc_hd__and2b_2_11') return 'enableGate'
	if(name === 'sky130_fd_sc_hd__dfrtp_2_47') return 'lockRegister'
	if(name === 'sky130_fd_sc_hd__dfrtp_2_81') return 'successRegister'
	if(name === 'sky130_fd_sc_hd__inv_2_7') return 'enableGate_N'
	
	if(name === 'sky130_fd_sc_hd__and4bb_2_6') return 'counterIs11'
	if(name === 'sky130_fd_sc_hd__nand3b_2_0') return 'lockBitComp2'
	if(name === 'sky130_fd_sc_hd__dfrtp_2_44') return 'counter_Bit0'
	if(name === 'sky130_fd_sc_hd__dfrtp_2_43') return 'counter_Bit1'
	if(name === 'sky130_fd_sc_hd__dfrtp_2_46') return 'counter_Bit2'
	if(name === 'sky130_fd_sc_hd__dfrtp_2_45') return 'counter_Bit3'
	if(name === 'sky130_fd_sc_hd__dfrtp_2_15') return 'counter2_Bit1'
	if(name === 'sky130_fd_sc_hd__dfrtp_2_17') return 'counter2_Bit3'
	if(name === 'sky130_fd_sc_hd__dfrtp_2_18') return 'counter2_Bit2'
	if(name === 'sky130_fd_sc_hd__dfrtp_2_16') return 'counter2_Bit0'
	
	if(name === 'sky130_fd_sc_hd__dfrtp_2_37') return 'failRegister1'
	if(name === 'sky130_fd_sc_hd__dfrtp_2_28') return 'failRegister2'
	if(name === 'sky130_fd_sc_hd__dfrtp_2_83') return 'lockRegisterBuffered'
	
	if(name === 'sky130_fd_sc_hd__dfrtp_2_29') return 'weirdLockRegister1'
	if(name === 'sky130_fd_sc_hd__inv_2_8') return 'weirdLockRegister1_N'
	if(name === 'sky130_fd_sc_hd__dfrtp_2_27') return 'weirdLockRegister2'
	
	if(name === 'sky130_fd_sc_hd__or4_2_4') return 'counterGreaterThan0'
	if(name === 'sky130_fd_sc_hd__or4bb_2_0') return 'counterNot10'
	
	if(name === 'sky130_fd_sc_hd__dfrtp_2_24') return 'highInputCounter_Bit1'
	if(name === 'sky130_fd_sc_hd__dfrtp_2_25') return 'highInputCounter_Bit2'
	if(name === 'sky130_fd_sc_hd__dfrtp_2_20') return 'highInputCounter_Bit4'
	if(name === 'sky130_fd_sc_hd__dfrtp_2_21') return 'highInputCounter_Bit5'
	if(name === 'sky130_fd_sc_hd__dfrtp_2_19') return 'highInputCounter_Bit6'
	if(name === 'sky130_fd_sc_hd__dfrtp_2_23') return 'highInputCounter_Bit0'
	if(name === 'sky130_fd_sc_hd__dfrtp_2_26') return 'highInputCounter_Bit3'
	if(name === 'sky130_fd_sc_hd__dfrtp_2_22') return 'highInputCounter_Bit7'

	if(name === 'sky130_fd_sc_hd__dfrtp_2_72') return 'io8NotTwice'
	if(name === 'sky130_fd_sc_hd__dfrtp_2_69') return 'io8Twice'
	// if(name === 'sky130_fd_sc_hd__dfrtp_2_73') return 'io10NotTwice'
	// if(name === 'sky130_fd_sc_hd__dfrtp_2_68') return 'io10Twice'
	
	// if(name === 'sky130_fd_sc_hd__or4b_2_0') return 'specialRegister1Condition'
	// if(name === 'sky130_fd_sc_hd__and2_2_1') return 'counters0High'
	// if(name === 'sky130_fd_sc_hd__nor2_2_7') return 'counters0Low'
	// if(name === 'sky130_fd_sc_hd__or2_2_1') return 'counters0Equal'
	// if(name === 'sky130_fd_sc_hd__nand2_2_4') return 'counters0OneLow'
	
	if(name.startsWith('sky130_fd_sc_hd__')) return name.substring('sky130_fd_sc_hd__'.length)

	return name
}

class Circuit {
	public constructor(public name: string, public inPorts: string[], public outPorts: string[], public graph: CircuitGraph) {}
	
	public static parse(lines: string[], inPorts: string[], outPorts: string[], circuits: Circuit[], circuitDefinitions: Record<string, { ports: string[], lines: string[] }>): Circuit {
		const items = lines[0].split(' ')
		const name = items[1]

		const instances: Record<string, { type: string, connections: Record<string, string> }> = {}

		for(const line of lines.slice(1)) {
			const instanceItems = line.split(' ')

			const instanceName = instanceItems[0].slice(1)
			const instanceType = instanceItems[instanceItems.length - 1]

			const connections: Record<string, string> = {}

			for(let index = 0; index < instanceItems.length - 2; index++) {
				const connectionId = instanceItems[index + 1]

				connections[circuitDefinitions[instanceType].ports[index]] = connectionId
			}
			
			instances[instanceName] = {
				type: instanceType,
				connections
			}
		}

		const graph: CircuitGraph = {}

		const visited: Set<string> = new Set()
		const frontier: string[] = []

		for(const port of inPorts) {
			visited.add(port)
			frontier.push(port)
		}

		while(frontier.length > 0) {
			const name = frontier.shift()!

			const instance = instances[name]

			if(instance) {
				const circuit = circuits.find(circuit => circuit.name === instance.type)
				
				if(!circuit) throw new Error(`Unknown circuit type ${instance.type}!`)
					
				graph[name] = {
					type: circuit.name,
					inPorts: graph[name]?.inPorts ?? {},
					outPorts: {}
				}

				for(const port of Object.keys(instance.connections)) {
					if(!circuit.outPorts.includes(port)) continue

					const connectionId = instance.connections[port]

					if(outPorts.includes(connectionId)) {
						if(!graph[name].outPorts[port]) graph[name].outPorts[port] = []
						graph[name].outPorts[port].push({ name: connectionId, port: connectionId })

						if(!graph[connectionId]) graph[connectionId] = { type: 'input', inPorts: {}, outPorts: {} }
						graph[connectionId].inPorts[connectionId] = { name, port }

						if(visited.has(connectionId)) continue
					
						visited.add(connectionId)
						frontier.push(connectionId)
					} else {
						const connectingInstances = Object.entries(instances).filter(([_, instance]) => Object.values(instance.connections).some(connection => connection === connectionId)).map(([otherName, _]) => otherName)

						for(const otherName of connectingInstances) {
							if(otherName === name) continue

							if(!graph[name].outPorts[port]) graph[name].outPorts[port] = []
							graph[name].outPorts[port] = graph[name].outPorts[port].concat(
								Object.entries(instances[otherName].connections).filter(([_, connection]) => connection === connectionId).map(([port, _]) => ({ name: otherName, port }))
							)

							if(!graph[otherName]) graph[otherName] = { type: 'unknown', inPorts: {}, outPorts: {} }
							for(const [otherPort, _] of Object.entries(instances[otherName].connections).filter(([_, connection]) => connection === connectionId)) {
								graph[otherName].inPorts[otherPort] = { name, port }
							}
							
							if(visited.has(otherName)) continue
							
							visited.add(otherName)
							frontier.push(otherName)
						}
					}
				}
			} else {
				const connectingInstances = Object.entries(instances).filter(([_, instance]) => Object.values(instance.connections).some(connection => connection === name)).map(([otherName, _]) => otherName)

				graph[name] = {
					type: 'input',
					inPorts: graph[name]?.inPorts ?? {},
					outPorts: {}
				}

				if(outPorts.includes(name)) continue

				for(const otherName of connectingInstances) {
					if(otherName === name) continue

					if(!graph[name].outPorts[name]) graph[name].outPorts[name] = []
					graph[name].outPorts[name].push({ name: otherName, port: Object.entries(instances[otherName].connections).find(([port, connection]) => connection === name)![0] })

					if(!graph[otherName]) graph[otherName] = { type: 'unknown', inPorts: {}, outPorts: {} }
					for(const [otherPort, _] of Object.entries(instances[otherName].connections).filter(([_, connection]) => connection === name)) {
						graph[otherName].inPorts[otherPort] = { name, port: name }
					}
					
					if(visited.has(otherName)) continue
					
					visited.add(otherName)
					frontier.push(otherName)
				}
			}
		}

		for(const id of Object.keys(graph)) {
			const circuit = circuits.find(circuit => circuit.name === graph[id].type)

			if(!circuit) continue

			for(const port of Object.keys(instances[id].connections)) {
				if(!circuit.inPorts.includes(port)) continue
				if(!outPorts.includes(instances[id].connections[port])) continue

				graph[id].inPorts[port] = { name: instances[id].connections[port], port: instances[id].connections[port] }
			}
		}

		simplify(graph)
		removeExtraneous(graph)
		reduceClockBuffers(graph)
		reduceRegisters(graph)
		// segment(graph)

		for(const key of Object.keys(graph)) {
			graph[key].cleanName = cleanName(key)
		}

		return new Circuit(name, inPorts, outPorts, graph)
	}

	private generateSignalCode(context: { prelude: string, main: string, handledNodes: string[] }, name: string) {
		const node = this.graph[name]
		
		// console.log(name, node.type)

		if(node.type === 'input' && name !== 'success') {
		// if(node.type === 'input' && name !== 'S') {
			return name
		}

		const forceNonInline = [ 'sky130_fd_sc_hd__or4bb_2_0' ]
		const forceInline = [ 
			// 'sky130_fd_sc_hd__and3_2_9',
			// 'sky130_fd_sc_hd__and3_2_11',
			// 'sky130_fd_sc_hd__and3_2_8',
			// 'sky130_fd_sc_hd__nand2_2_24',
			// 'sky130_fd_sc_hd__and2_2_9',
			// 'sky130_fd_sc_hd__and4_2_4',
			'sky130_fd_sc_hd__inv_2_2',
			'sky130_fd_sc_hd__inv_2_1',
			'sky130_fd_sc_hd__inv_2_3',
			'sky130_fd_sc_hd__inv_2_16',
			'sky130_fd_sc_hd__inv_2_19',
			'sky130_fd_sc_hd__inv_2_17',
			'sky130_fd_sc_hd__inv_2_18',
			'sky130_fd_sc_hd__inv_2_20',

			'sky130_fd_sc_hd__nor2_2_45',
			'sky130_fd_sc_hd__and4bb_2_12',
			'sky130_fd_sc_hd__nand4_2_13',
			'sky130_fd_sc_hd__and4bb_2_11',
			'sky130_fd_sc_hd__nand4_2_12',
			'sky130_fd_sc_hd__nand2_2_33',
			'sky130_fd_sc_hd__nand2_2_36',
			'sky130_fd_sc_hd__nand2_2_14',
			'sky130_fd_sc_hd__nand2_2_37',
			'sky130_fd_sc_hd__nor2_2_44',
			'sky130_fd_sc_hd__and4bb_2_9',
			'sky130_fd_sc_hd__nand4_2_9',
			'sky130_fd_sc_hd__and4bb_2_13',
			'sky130_fd_sc_hd__nand4_2_10',
			'sky130_fd_sc_hd__and4b_2_2',
			'sky130_fd_sc_hd__nand4_2_11',
			'sky130_fd_sc_hd__nor2_2_41',
			'sky130_fd_sc_hd__nor4_2_1',
			'sky130_fd_sc_hd__nand4_2_7',
			'sky130_fd_sc_hd__nor2_2_43',
			'sky130_fd_sc_hd__and4bb_2_10',
			'sky130_fd_sc_hd__nand4_2_8',

			'sky130_fd_sc_hd__or4b_2_7',
			'sky130_fd_sc_hd__or4b_2_5',
			'sky130_fd_sc_hd__or4b_2_4',
			'sky130_fd_sc_hd__or4b_2_6',

			// 'sky130_fd_sc_hd__and2_2_1',
			// 'sky130_fd_sc_hd__nor2_2_7',
			// 'sky130_fd_sc_hd__or2_2_1',
			// 'sky130_fd_sc_hd__nand2_2_4',
			// 'sky130_fd_sc_hd__xor2_2_0',
			// 'sky130_fd_sc_hd__xnor2_2_1',
			// 'sky130_fd_sc_hd__nand2_2_7',
			// 'sky130_fd_sc_hd__nor2_2_0',
			// 'sky130_fd_sc_hd__and2b_2_0',

			'sky130_fd_sc_hd__nand2_2_35',

			'sky130_fd_sc_hd__nor2_2_15',
			// 'sky130_fd_sc_hd__or4b_2_0',
			// 'sky130_fd_sc_hd__o211a_2_3',
			// 'sky130_fd_sc_hd__xor2_2_5',
			// 'sky130_fd_sc_hd__a21oi_2_7',
			// 'sky130_fd_sc_hd__a21o_2_5',
			// 'sky130_fd_sc_hd__a21o_2_8',
			// 'sky130_fd_sc_hd__a32o_2_0',
			// 'sky130_fd_sc_hd__xor2_2_0',
			// 'sky130_fd_sc_hd__xor2_2_1',
			// 'sky130_fd_sc_hd__a21oi_2_10',
			// 'sky130_fd_sc_hd__xor2_2_7',
			// 'sky130_fd_sc_hd__xnor2_2_0',
			// 'sky130_fd_sc_hd__nor2_2_6',
			// 'sky130_fd_sc_hd__nor2_2_0',
			// 'sky130_fd_sc_hd__xnor2_2_1',
			// 'sky130_fd_sc_hd__nand2_2_4',
			// 'sky130_fd_sc_hd__nand2_2_4',
			// 'sky130_fd_sc_hd__nand2_2_8',
			// 'sky130_fd_sc_hd__nand2_2_18',
			// 'sky130_fd_sc_hd__xnor2_2_5',
		]

		if(!context.handledNodes.includes(name)) {
			if(!forceInline.includes(name)) context.handledNodes.push(name)

			const inputs: Record<string, string> = {}

			for(const port of Object.keys(node.inPorts)) {
				if(['VGND', 'VNB', 'VPWR', 'VPB'].includes(port)) continue

				const value = this.generateSignalCode(context, node.inPorts[port].name)

				inputs[port] = value
			}

			if(node.type === 'sky130_fd_sc_hd__dfrtp_2') {
				context.main += `\nconst ${cleanName(name)} = new Register(${inputs['D']}, ${inputs['RESET_B']}) // ${cleanName(name)}`

				return cleanName(name)
			}

			let format = `${cleanName(node.type)}({${Object.entries(inputs).map(([key, value]) => `${key}: ${value}`).join(', ')}})`

			if(node.type === 'sky130_fd_sc_hd__buf_2') {
				format = `${inputs['A']}`
				
				if(node.outPorts['X'].length === 1 || forceInline.includes(name)) {
					return format
				}
			}

			if(node.type === 'sky130_fd_sc_hd__conb_1') {
				// format = `'HI or LOW'`
				return `'HI'`
			}

			if(node.type === 'sky130_fd_sc_hd__xnor2_2') {
				format = `(${inputs['A']} === ${inputs['B']})`
				
				if(node.outPorts['Y'].length === 1 || forceInline.includes(name)) {
					return format
				}
			}

			if(node.type === 'sky130_fd_sc_hd__xor2_2') {
				format = `(${inputs['A']} !== ${inputs['B']})`
				
				if(node.outPorts['X'].length === 1 || forceInline.includes(name)) {
					return format
				}
			}

			if(node.type === 'sky130_fd_sc_hd__nor2_2') {
				format = `!(${inputs['A']} || ${inputs['B']})`
				
				if(node.outPorts['Y'].length === 1 || forceInline.includes(name)) {
					return format
				}
			}

			if(node.type === 'sky130_fd_sc_hd__nor3_2') {
				format = `!(${inputs['A']} || ${inputs['B']} || ${inputs['C']})`
				
				if(node.outPorts['Y'].length === 1 || forceInline.includes(name)) {
					return format
				}
			}

			if(node.type === 'sky130_fd_sc_hd__nor4_2') {
				format = `!(${inputs['A']} || ${inputs['B']} || ${inputs['C']} || ${inputs['D']})`
				
				if(node.outPorts['Y'].length === 1 || forceInline.includes(name)) {
					return format
				}
			}


			if(node.type === 'sky130_fd_sc_hd__nand2_2') {
				format = `!(${inputs['A']} && ${inputs['B']})`
				
				if(node.outPorts['Y'].length === 1 || forceInline.includes(name)) {
					return format
				}
			}

			if(node.type === 'sky130_fd_sc_hd__nand2b_2') {
				format = `!(${inputs['A_N']} && ${inputs['B']})`
				
				if(node.outPorts['Y'].length === 1 || forceInline.includes(name)) {
					return format
				}
			}

			if(node.type === 'sky130_fd_sc_hd__nand3_2') {
				format = `!(${inputs['A']} && ${inputs['B']} && ${inputs['C']})`
				
				if(node.outPorts['Y'].length === 1 || forceInline.includes(name)) {
					return format
				}
			}

			if(node.type === 'sky130_fd_sc_hd__nand3b_2') {
				format = `!(!${inputs['A_N']} && ${inputs['B']} && ${inputs['C']})`
				
				if(node.outPorts['Y'].length === 1 || forceInline.includes(name)) {
					return format
				}
			}

			if(node.type === 'sky130_fd_sc_hd__nand4_2') {
				format = `!(${inputs['A']} && ${inputs['B']} && ${inputs['C']} && ${inputs['D']})`
				
				if(node.outPorts['Y'].length === 1 || forceInline.includes(name)) {
					return format
				}
			}

			if(node.type === 'sky130_fd_sc_hd__and2_2') {
				format = `(${inputs['A']} && ${inputs['B']})`
				
				if(node.outPorts['X'].length === 1 || forceInline.includes(name)) {
					return format
				}
			}

			if(node.type === 'sky130_fd_sc_hd__and2b_2') {
				format = `(!${inputs['A_N']} && ${inputs['B']})`
				
				if(node.outPorts['X'].length === 1 || forceInline.includes(name)) {
					return format
				}
			}

			if(node.type === 'sky130_fd_sc_hd__and3_2') {
				format = `(${inputs['A']} && ${inputs['B']} && ${inputs['C']})`
				
				if(node.outPorts['X'].length === 1 || forceInline.includes(name)) {
					return format
				}
			}

			if(node.type === 'sky130_fd_sc_hd__or2_2') {
				format = `(${inputs['A']} || ${inputs['B']})`
				
				if(node.outPorts['X'].length === 1 || forceInline.includes(name)) {
					return format
				}
			}

			if(node.type === 'sky130_fd_sc_hd__or3_2') {
				format = `(${inputs['A']} || ${inputs['B']} || ${inputs['C']})`
				
				if(node.outPorts['X'].length === 1 || forceInline.includes(name)) {
					return format
				}
			}

			if(node.type === 'sky130_fd_sc_hd__or4_2') {
				format = `(${inputs['A']} || ${inputs['B']} || ${inputs['C']} || ${inputs['D']})`
				
				if(node.outPorts['X'].length === 1 || forceInline.includes(name)) {
					return format
				}
			}

			if(node.type === 'sky130_fd_sc_hd__or4b_2') {
				format = `(${inputs['A']} || ${inputs['B']} || ${inputs['C']} || !${inputs['D_N']})`
				
				if(node.outPorts['X'].length === 1 || forceInline.includes(name)) {
					return format
				}
			}

			if(node.type === 'sky130_fd_sc_hd__or4bb_2') {
				format = `(${inputs['A']} || ${inputs['B']} || !${inputs['C_N']} || !${inputs['D_N']})`
				
				if((node.outPorts['X'].length === 1 || forceInline.includes(name)) && !forceNonInline.includes(name)) {
					return format
				}
			}

			if(node.type === 'sky130_fd_sc_hd__a32o_2') {
				format = `((${inputs['A1']} && ${inputs['A2']} && ${inputs['A3']}) || (${inputs['B1']} && ${inputs['B2']}))`
				
				if(node.outPorts['X'].length === 1 || forceInline.includes(name)) {
					return format
				}
			}

			if(node.type === 'sky130_fd_sc_hd__a211oi_2') {
				format = `!((${inputs['A1']} && ${inputs['A2']}) || ${inputs['B1']} || ${inputs['C1']})`
				
				if(node.outPorts['Y'].length === 1 || forceInline.includes(name)) {
					return format
				}
			}

			if(node.type === 'sky130_fd_sc_hd__a221o_2') {
				format = `((${inputs['A1']} && ${inputs['A2']}) || (${inputs['B1']} && ${inputs['B2']}) || ${inputs['C1']})`
				
				if(node.outPorts['X'].length === 1 || forceInline.includes(name)) {
					return format
				}
			}

			if(node.type === 'sky130_fd_sc_hd__a221oi_2') {
				format = `!((${inputs['A1']} && ${inputs['A2']}) || (${inputs['B1']} && ${inputs['B2']}) || ${inputs['C1']})`
				
				if(node.outPorts['Y'].length === 1 || forceInline.includes(name)) {
					return format
				}
			}

			if(node.type === 'sky130_fd_sc_hd__a41oi_2') {
				format = `!((${inputs['A1']} && ${inputs['A2']} && ${inputs['A3']} && ${inputs['A4']}) || ${inputs['B1']})`
				
				if(node.outPorts['Y'].length === 1 || forceInline.includes(name)) {
					return format
				}
			}

			if(node.type === 'sky130_fd_sc_hd__a21o_2') {
				format = `((${inputs['A1']} && ${inputs['A2']}) || ${inputs['B1']})`
				
				if(node.outPorts['X'].length === 1 || forceInline.includes(name)) {
					return format
				}
			}

			if(node.type === 'sky130_fd_sc_hd__a21bo_2') {
				format = `((${inputs['A1']} && ${inputs['A2']}) || !${inputs['B1_N']})`
				
				if(node.outPorts['X'].length === 1 || forceInline.includes(name)) {
					return format
				}
			}

			if(node.type === 'sky130_fd_sc_hd__a21oi_2') {
				format = `!((${inputs['A1']} && ${inputs['A2']}) || ${inputs['B1']})`
				
				if(node.outPorts['Y'].length === 1 || forceInline.includes(name)) {
					return format
				}
			}

			if(node.type === 'sky130_fd_sc_hd__a22o_2') {
				format = `((${inputs['A1']} && ${inputs['A2']}) || (${inputs['B1']} && ${inputs['B2']}))`
				
				if(node.outPorts['X'].length === 1 || forceInline.includes(name)) {
					return format
				}
			}

			if(node.type === 'sky130_fd_sc_hd__a211o_2') {
				format = `((${inputs['A1']} && ${inputs['A2']}) || ${inputs['B1']} || ${inputs['C1']})`
				
				if(node.outPorts['X'].length === 1 || forceInline.includes(name)) {
					return format
				}
			}

			if(node.type === 'sky130_fd_sc_hd__a31o_2') {
				format = `((${inputs['A1']} && ${inputs['A2']} && ${inputs['A3']}) || ${inputs['B1']})`
				
				if(node.outPorts['X'].length === 1 || forceInline.includes(name)) {
					return format
				}
			}

			if(node.type === 'sky130_fd_sc_hd__a311o_2') {
				format = `((${inputs['A1']} && ${inputs['A2']} && ${inputs['A3']}) || ${inputs['B1']} || ${inputs['C1']})`
				
				if(node.outPorts['X'].length === 1 || forceInline.includes(name)) {
					return format
				}
			}

			if(node.type === 'sky130_fd_sc_hd__o21a_2') {
				format = `((${inputs['A1']} || ${inputs['A2']}) && ${inputs['B1']})`
				
				if(node.outPorts['X'].length === 1 || forceInline.includes(name)) {
					return format
				}
			}

			if(node.type === 'sky130_fd_sc_hd__o21ba_2') {
				format = `((${inputs['A1']} || ${inputs['A2']}) && !${inputs['B1_N']})`
				
				if(node.outPorts['X'].length === 1 || forceInline.includes(name)) {
					return format
				}
			}

			if(node.type === 'sky130_fd_sc_hd__o211a_2') {
				format = `((${inputs['A1']} || ${inputs['A2']}) && ${inputs['B1']} && ${inputs['C1']})`
				
				if(node.outPorts['X'].length === 1 || forceInline.includes(name)) {
					return format
				}
			}

			if(node.type === 'sky130_fd_sc_hd__o32a_2') {
				format = `((${inputs['A1']} || ${inputs['A2']} || ${inputs['A3']}) && (${inputs['B1']} || ${inputs['B2']}))`
				
				if(node.outPorts['X'].length === 1 || forceInline.includes(name)) {
					return format
				}
			}

			if(node.type === 'sky130_fd_sc_hd__o22a_2') {
				format = `((${inputs['A1']} || ${inputs['A2']}) && (${inputs['B1']} || ${inputs['B2']}))`
				
				if(node.outPorts['X'].length === 1 || forceInline.includes(name)) {
					return format
				}
			}

			if(node.type === 'sky130_fd_sc_hd__o22ai_2') {
				format = `!((${inputs['A1']} || ${inputs['A2']}) && (${inputs['B1']} || ${inputs['B2']}))`
				
				if(node.outPorts['Y'].length === 1 || forceInline.includes(name)) {
					return format
				}
			}

			if(node.type === 'sky130_fd_sc_hd__o221a_2') {
				format = `((${inputs['A1']} || ${inputs['A2']}) && (${inputs['B1']} || ${inputs['B2']}) && ${inputs['C1']})`
				
				if(node.outPorts['X'].length === 1 || forceInline.includes(name)) {
					return format
				}
			}

			if(node.type === 'sky130_fd_sc_hd__o211ai_2') {
				format = `!((${inputs['A1']} || ${inputs['A2']}) && ${inputs['B1']} && ${inputs['C1']})`
				
				if(node.outPorts['Y'].length === 1 || forceInline.includes(name)) {
					return format
				}
			}

			if(node.type === 'sky130_fd_sc_hd__o21ai_2') {
				format = `!((${inputs['A1']} || ${inputs['A2']}) && ${inputs['B1']})`
				
				if(node.outPorts['Y'].length === 1 || forceInline.includes(name)) {
					return format
				}
			}

			if(node.type === 'sky130_fd_sc_hd__o2bb2a_2') {
				format = `((!${inputs['A1_N']} || !${inputs['A2_N']}) && (${inputs['B1']} || ${inputs['B2']}))`
				
				if(node.outPorts['X'].length === 1 || forceInline.includes(name)) {
					return format
				}
			}

			if(node.type === 'sky130_fd_sc_hd__o311a_2') {
				format = `((${inputs['A1']} || ${inputs['A2']} || ${inputs['A3']}) && ${inputs['B1']} && ${inputs['C1']})`
				
				if(node.outPorts['X'].length === 1 || forceInline.includes(name)) {
					return format
				}
			}

			if(node.type === 'sky130_fd_sc_hd__o31ai_2') {
				format = `!((${inputs['A1']} || ${inputs['A2']} || ${inputs['A3']}) && ${inputs['B1']})`
				
				if(node.outPorts['Y'].length === 1 || forceInline.includes(name)) {
					return format
				}
			}

			if(node.type === 'sky130_fd_sc_hd__inv_2') {
				format = `!${inputs['A']}`

				if(node.outPorts['Y'].length === 1 || forceInline.includes(name)) {
					return format
				}
			}

			if(node.type === 'sky130_fd_sc_hd__and4_2') {
				format = `(${inputs['A']} && ${inputs['B']} && ${inputs['C']} && ${inputs['D']})`
				
				if(node.outPorts['X'].length === 1 || forceInline.includes(name)) {
					return format
				}
			}

			if(node.type === 'sky130_fd_sc_hd__and4b_2') {
				format = `(!${inputs['A_N']} && ${inputs['B']} && ${inputs['C']} && ${inputs['D']})`
				
				if(node.outPorts['X'].length === 1 || forceInline.includes(name)) {
					return format
				}
			}

			if(node.type === 'sky130_fd_sc_hd__and4bb_2') {
				format = `(!${inputs['A_N']} && !${inputs['B_N']} && ${inputs['C']} && ${inputs['D']})`
				
				if(node.outPorts['X'].length === 1 || forceInline.includes(name)) {
					return format
				}
			}

			if(node.type === 'sky130_fd_sc_hd__mux2_1') {
				format = `(${inputs['S']} ? ${inputs['A0']} : ${inputs['A1']})`
				
				if(node.outPorts['X'].length === 1 || forceInline.includes(name)) {
					return format
				}
			}

			context.main += `\nconst ${cleanName(name)} = ${format} // ${cleanName(name)}`
		}
		
		return cleanName(name)
	}

	public generateCode(): string {
		const context = { prelude: '', main: '', handledNodes: [] }

		this.generateSignalCode(context, 'success')
		// this.generateSignalCode(context, 'S')

		return context.prelude + '\n' + context.main
	}
}

const CIRCUIT_DEFINITIONS: Circuit[] = [
	new Circuit('sky130_fd_sc_hd__mux2_1', ['S', 'A0', 'A1', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	
	new Circuit('sky130_fd_sc_hd__and2_2', ['A', 'B', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__and2b_2', ['A_N', 'B', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__and3_2', ['A', 'B', 'C', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__and3b_2', ['A_N', 'B', 'C', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__and4_2', ['A', 'B', 'C', 'D', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__and4b_2', ['A_N', 'B', 'C', 'D', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__and4bb_2', ['A_N', 'B_N', 'C', 'D', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__or2_2', ['A', 'B', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__or3_2', ['A', 'B', 'C', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__or3b_2', ['A', 'B', 'C_N', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__or4_2', ['A', 'B', 'C', 'D', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__or4b_2', ['A', 'B', 'C', 'D_N', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__or4bb_2', ['A', 'B', 'C_N', 'D_N', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__xor2_2', ['A', 'B', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	
	new Circuit('sky130_fd_sc_hd__nand2_2', ['A', 'B', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__nand2b_2', ['A_N', 'B', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__nand3_2', ['A', 'B', 'C', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__nand3b_2', ['A_N', 'B', 'C', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__nand4_2', ['A', 'B', 'C', 'D', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__nor2_2', ['A', 'B', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__nor3_2', ['A', 'B', 'C', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__nor3b_2', ['A', 'B', 'C_N', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__nor4_2', ['A', 'B', 'C', 'D', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__nor4b_2', ['A', 'B', 'C', 'D_N', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__xnor2_2', ['A', 'B', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__inv_2', ['A', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	
	new Circuit('sky130_fd_sc_hd__a21o_2', ['A1', 'A2', 'B1', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__a21bo_2', ['A1', 'A2', 'B1_N', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__a211o_2', ['A1', 'A2', 'B1', 'C1', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__a22o_2', ['A1', 'A2', 'B1', 'B2', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__a31o_2', ['A1', 'A2', 'A3', 'B1', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__a32o_2', ['A1', 'A2', 'A3', 'B1', 'B2', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__a311o_2', ['A1', 'A2', 'A3', 'B1', 'C1', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__a221o_2', ['A1', 'A2', 'B1', 'B2', 'C1', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__o2bb2a_2', ['A1_N', 'A2_N', 'B1', 'B2', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__o21a_2', ['A1', 'A2', 'B1', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__o21ba_2', ['A1', 'A2', 'B1_N', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__o22a_2', ['A1', 'A2', 'B1', 'B2', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__o211a_2', ['A1', 'A2', 'B1', 'C1', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__o311a_2', ['A1', 'A2', 'A3', 'B1', 'C1', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__o31a_2', ['A1', 'A2', 'A3', 'B1', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__o221a_2', ['A1', 'A2', 'B1', 'B2', 'C1', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__o32a_2', ['A1', 'A2', 'A3', 'B1', 'B2', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),

	new Circuit('sky130_fd_sc_hd__a21oi_2', ['A1', 'A2', 'B1', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__a21boi_2', ['A1', 'A2', 'B1_N', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__a211oi_2', ['A1', 'A2', 'B1', 'C1', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__a31oi_2', ['A1', 'A2', 'A3', 'B1', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__a22oi_2', ['A1', 'A2', 'B1', 'B2', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__a221oi_2', ['A1', 'A2', 'B1', 'B2', 'C1', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__a41oi_2', ['A1', 'A2', 'A3', 'A4', 'B1', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__a2111oi_2', ['A1', 'A2', 'B1', 'C1', 'D1', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__o21ai_2', ['A1', 'A2', 'B1', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__o21bai_2', ['A1', 'A2', 'B1_N', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__o211ai_2', ['A1', 'A2', 'B1', 'C1', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__o22ai_2', ['A1', 'A2', 'B1', 'B2', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__o31ai_2', ['A1', 'A2', 'A3', 'B1', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__o32ai_2', ['A1', 'A2', 'A3', 'B1', 'B2', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),

	new Circuit('sky130_fd_sc_hd__dfrtp_2', ['D', 'CLK', 'RESET_B', 'VPWR', 'VGND', 'VPB', 'VND'], ['Q'], {}),
	new Circuit('sky130_fd_sc_hd__dfstp_2', ['D', 'CLK', 'SET_B', 'SCD', 'SCE', 'VPWR', 'VGND', 'VPB', 'VND'], ['Q'], {}),
	new Circuit('sky130_fd_sc_hd__dfxtp_2', ['D', 'CLK', 'SCD', 'SCE', 'VPWR', 'VGND', 'VPB', 'VND'], ['Q'], {}),

	new Circuit('sky130_fd_sc_hd__decap_3', ['VPWR', 'VGND', 'VPB', 'VND'], [], {}),
	new Circuit('sky130_fd_sc_hd__diode_2', ['DIODE', 'VPWR', 'VGND', 'VPB', 'VND'], [], {}),
	new Circuit('sky130_fd_sc_hd__clkbuf_16', ['A', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__clkbuf_8', ['A', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__clkbuf_4', ['A', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__buf_2', ['A', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__conb_1', ['VPWR', 'VGND', 'VPB', 'VND'], ['LO', 'HI'], {}),
]

class Project {
	private constructor(public circuits: Circuit[]) {}

	public static parse(text: string) {
		const circuitDefinitions: Record<string, { ports: string[], lines: string[] }> = {}

		const circuits: Circuit[] = []
		let circuitContent: string[] = []
		let withinCircuit = false

		for(let line of text.split('\n')) {
			line = line.trim()

			if(line.length === 0) continue

			if(line.startsWith('.subckt')) {
				withinCircuit = true

				circuitContent = [ line ]

				continue
			}

			if(line.startsWith('+')) {
				circuitContent[circuitContent.length - 1] += ' ' + line.slice(2)

				continue
			}

			if(line.startsWith('.ends')) {
				withinCircuit = false

				const items = circuitContent[0].split(' ')
				const name = items[1]
				const ports = items.slice(2)

				circuitDefinitions[name] = { ports, lines: circuitContent }

				continue
			}

			if(withinCircuit) {
				circuitContent.push(line)
			}
		}

		// circuits.push(Circuit.parse(circuitDefinitions['adder_demo'].lines, ['A', 'B', 'clk', 'en', 'rst_n', 'VGND', 'VPWR'], ['S'], CIRCUIT_DEFINITIONS, circuitDefinitions))
		circuits.push(Circuit.parse(circuitDefinitions['puzzle'].lines, ['I', 'clk', 'enable', 'rst_n', 'VGND', 'VPWR'], ['success', 'O[0]', 'O[1]', 'O[2]', 'O[3]', 'O[4]', 'O[5]', 'O[6]', 'O[7]'], CIRCUIT_DEFINITIONS, circuitDefinitions))

		return new Project(circuits)
	}
}

// const spiceSource = await Deno.readTextFile('./adder_demo.spice')
const spiceSource = await Deno.readTextFile('./puzzle.spice')
const project = Project.parse(spiceSource)

// await Deno.writeTextFile('../visualizer/src/data.json', JSON.stringify(project.circuits.find(circuit => circuit.name === 'adder_demo')?.graph, null, 2))
await Deno.writeTextFile('../visualizer/src/data.json', JSON.stringify(project.circuits.find(circuit => circuit.name === 'puzzle')?.graph, null, 2))
// await Deno.writeTextFile('.code.js', project.circuits.find(circuit => circuit.name === 'adder_demo')!.generateCode())
await Deno.writeTextFile('.code.js', project.circuits.find(circuit => circuit.name === 'puzzle')!.generateCode())