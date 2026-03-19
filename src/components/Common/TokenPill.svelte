<script>
	export let tokens = 0;
	export let label = "Tokens";

	$: pct = Math.min((tokens / 1048576) * 100, 100);
</script>

<div class="token-pill-wrapper relative group">
	<!-- Pill -->
	<div class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border cursor-default select-none transition-colors
		{tokens === 0
			? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400'
			: tokens < 500000
				? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400'
				: tokens < 900000
					? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-400'
					: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-400'}">
		<i class="fas fa-coins text-[9px]"></i>
		<span class="font-black font-mono text-[11px] tracking-tight">{tokens.toLocaleString()}</span>
		<span class="text-[9px] font-bold uppercase opacity-60">{label}</span>
	</div>

	<!-- Tooltip -->
	<div class="absolute right-0 top-full mt-2 w-80 z-[100]
		bg-gray-950 text-white rounded-2xl shadow-2xl border border-white/10
		opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto
		transition-all duration-200 translate-y-1 group-hover:translate-y-0">
		<div class="p-4 flex flex-col gap-4">
			<!-- How tokens work -->
			<div>
				<div class="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1.5">
					<i class="fas fa-circle-info text-blue-400"></i> How this is calculated
				</div>
				<p class="text-[11px] text-gray-300 leading-relaxed">
					Tokens are calculated using the <span class="font-bold text-white">@anthropic-ai/tokenizer</span>. This provides a precise count for most modern LLMs (Gemini, Claude, GPT-4).
				</p>
			</div>

			<div class="h-px bg-white/10"></div>

			<!-- Model limits -->
			<div>
				<div class="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-1.5">
					<i class="fas fa-microchip text-blue-400"></i> Gemini 3 family (latest)
				</div>
				<div class="flex flex-col gap-4">
					<!-- Gemini 3 Pro -->
					<div class="flex flex-col gap-1.5">
						<div class="flex items-center justify-between">
							<span class="text-[10px] font-bold text-gray-200">Gemini 3 Pro</span>
							<span class="text-[10px] font-mono {pct > 90 ? 'text-red-400' : pct > 60 ? 'text-amber-400' : 'text-emerald-400'}">
								{pct.toFixed(1)}% · 1M-10M limit
							</span>
						</div>
						<div class="h-1.5 rounded-full bg-white/10 overflow-hidden">
							<div class="h-full rounded-full transition-all duration-500
								{pct > 90 ? 'bg-red-500' : pct > 60 ? 'bg-amber-400' : 'bg-emerald-500'}"
								style="width: {pct}%">
							</div>
						</div>
						<p class="text-[9px] text-gray-400 leading-tight">
							🧠 Flagship reasoning + multimodal. 1M is standard in APIs, up to 10M experimental.
						</p>
					</div>

					<!-- Gemini 3 Flash -->
					<div class="flex flex-col gap-1.5">
						<div class="flex items-center justify-between">
							<span class="text-[10px] font-bold text-gray-200">Gemini 3 Flash</span>
							<span class="text-[10px] font-mono {pct > 90 ? 'text-red-400' : pct > 60 ? 'text-amber-400' : 'text-emerald-400'}">
								{pct.toFixed(1)}% · 1M limit
							</span>
						</div>
						<div class="h-1.5 rounded-full bg-white/10 overflow-hidden">
							<div class="h-full rounded-full transition-all duration-500
								{pct > 90 ? 'bg-red-500' : pct > 60 ? 'bg-amber-400' : 'bg-emerald-500'}"
								style="width: {pct}%">
							</div>
						</div>
						<p class="text-[9px] text-gray-400 leading-tight">
							⚡ Faster + cheaper version of Pro. Optimized for low latency.
						</p>
					</div>
				</div>
			</div>

			<div class="h-px bg-white/10"></div>
			<p class="text-[10px] text-gray-500 leading-relaxed italic">
				Exceeding the context window will cause the model to truncate or refuse the input.
			</p>
		</div>
	</div>
</div>
