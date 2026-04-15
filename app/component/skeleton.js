

const SkeletonGrid = () => {
	return(
		<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-15">
			{[...Array(8)].map((_, i) => (
				<div key={i} className="bg-[#0d1a2e] rounded-2xl overflow-hidden border border-[#162236]">
					<div className="h-56 bg-[#162236] animate-pulse"/>
          <div className="p-4 flex flex-col gap-3">
            <div className="bg-[#162236] h-5 w-3/4 rounded-lg animate-pulse"/>
            <div className="bg-[#162236] h-4 w-1/2 rounded-lg animate-pulse"/>
            <div className="bg-[#162236] h-4 w-1/3 rounded-lg animate-pulse"/>
          </div>	

				</div>
					
			))}
		</div>
	)
}
export default SkeletonGrid