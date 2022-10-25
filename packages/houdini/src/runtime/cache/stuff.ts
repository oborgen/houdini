import { GraphQLValue } from '../lib/types'
import { LinkedList } from './cache'

export function flattenList<T>(source: LinkedList<T>): T[] {
	const flat: T[] = []

	// we need to flatten the list links
	const unvisited = [source || []]
	while (unvisited.length > 0) {
		const target = unvisited.shift() as T[]

		for (const id of target) {
			if (Array.isArray(id)) {
				unvisited.push(id)
				continue
			}

			flat.push(id)
		}
	}

	return flat
}

// given a raw key and a set of variables, generate the fully qualified key
export function evaluateKey(key: string, variables: { [key: string]: GraphQLValue } = {}): string {
	// accumulate the evaluated key
	let evaluated = ''
	// accumulate a variable name that we're evaluating
	let varName = ''
	// some state to track if we are "in" a string
	let inString = false

	// A set of variables read when evaluating the key.
	const readVariables = new Set<String>()

	for (const char of key) {
		// if we are building up a variable
		if (varName) {
			// if we are looking at a valid variable character
			if (varChars.includes(char)) {
				// add it to the variable name
				varName += char
				continue
			}
			// we are at the end of a variable name so we
			// need to clean up and add before continuing with the string

			// look up the variable and add the result (varName starts with a $)
			const value = variables[varName.slice(1)]

			evaluated += typeof value !== 'undefined' ? JSON.stringify(value) : 'undefined'

			// Mark the variable as being read.
			readVariables.add(varName.slice(1));

			// clear the variable name accumulator
			varName = ''
		}

		// if we are looking at the start of a variable
		if (char === '$' && !inString) {
			// start the accumulator
			varName = '$'

			// move along
			continue
		}

		// if we found a quote, invert the string state
		if (char === '"') {
			inString = !inString
		}

		// this isn't a special case, just add the letter to the value
		evaluated += char
	}

	// A map of variables to stringified values of variables that are not
	// contained in the GraphQL query.
	const extraVariables = new Map<String, String>();

	// Process each variable.
	for(const variable in variables) {
		// Check if the variable was read in the for loop above.
		if(!readVariables.has(variable)) {
			// If not, add it to extraVariables.
			const value = variables[variable];
			extraVariables.set(variable, typeof value !== 'undefined'
				? JSON.stringify(value)
				: 'undefined');
		}
	}

	// Add extraVariables to evaluated if at least one extra variable exists.
	if(extraVariables.size > 0) {
		evaluated += " " + JSON.stringify(Object.fromEntries(extraVariables));
	}

	return evaluated
}

// the list of characters that make up a valid graphql variable name
const varChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_0123456789'
