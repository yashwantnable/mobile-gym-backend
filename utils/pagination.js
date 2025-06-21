const pagination = async(model, page = 1, limit = 10, sortOrder = 'desc', aggregations, roleId = "") => {

    
  const countResult = await model.aggregate([...aggregations,{
    $count: "totalCount"
  }]).exec();
  console.log("countResult",countResult);

  const totalCount=countResult.length?countResult[0].totalCount:0
  console.log("Total Count:", totalCount);

  // Calculate the total number of pages
  const totalPages = Math.ceil(totalCount / limit);

  // Adjust the page number if it exceeds the total pages
  const currentPage = page > totalPages ? totalPages : page;

  // Calculate the new offset based on the adjusted page number
  const newOffset = (currentPage - 1) * limit;

  const newSortOrder = sortOrder === "desc" ? -1 : 1;

  return { newOffset, newLimit: limit, totalPages, totalCount, newSortOrder, roleId };
};

export default pagination