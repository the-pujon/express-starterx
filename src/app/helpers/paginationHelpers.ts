import { SortOrder } from 'mongoose';

type IOptions = {
	page?: number;
	limit?: number;
	sortBy?: string;
	sortOrder?: SortOrder;
};

type IOptionsResult = {
	page: number;
	limit: number;
	skip: number;
	sortBy: string;
	sortOrder: SortOrder;
};

const calculatePaginetion = (options: IOptions): IOptionsResult => {
	//console.log('cal paginetions--', options);
	const page = Number(options.page || 1);
	const limit = Number(options.limit || 10);
	const skip = (page - 1) * limit;

	//sorting
	const sortBy = options.sortBy || 'createdAt';
	const sortOrder = options.sortOrder || 'desc';

	return {
		page,
		limit,
		skip,
		sortBy,
		sortOrder,
	};
};
export const paginetionHelpers = {
	calculatePaginetion,
};
