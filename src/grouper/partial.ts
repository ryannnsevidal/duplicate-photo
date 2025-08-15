export type Hash64 = bigint;

function jaccardSet(a: Set<string>, b: Set<string>) {
	const inter = [...a].filter((x) => b.has(x)).length;
	const uni = a.size + b.size - inter;
	return uni === 0 ? 0 : inter / uni;
}

function bucket20(h: Hash64): string {
	return (h >> 44n).toString();
}

export function partialOverlapScore(aPages: Hash64[], bPages: Hash64[]) {
	const SA = new Set(aPages.map(bucket20));
	const SB = new Set(bPages.map(bucket20));
	const jac = jaccardSet(SA, SB);
	let relation: 'subset' | 'superset' | 'overlap' | 'disjoint' = 'disjoint';
	if (jac === 0) relation = 'disjoint';
	else {
		const inter = [...SA].filter((x) => SB.has(x)).length;
		if (inter === SA.size && SA.size < SB.size) relation = 'subset';
		else if (inter === SB.size && SB.size < SA.size) relation = 'superset';
		else relation = 'overlap';
	}
	return { jaccard: jac, relation };
}