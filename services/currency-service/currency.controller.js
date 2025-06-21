import { Currency } from "../../models/master.model.js";
import { Exchange } from "../../models/exchange.model.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { Country } from "../../models/master.model.js";


// Create Currency
const createCurrency = asyncHandler(async (req, res) => {
    console.log("create currency", req.body);

    const { currencyName, currencyCode, currencySymbol, country, status } = req.body;

    const requiredFields = { currencyName, currencyCode, currencySymbol, country };
    const missingFields = Object.keys(requiredFields).filter(
        (field) => !requiredFields[field] || requiredFields[field] === "undefined"
    );

    if (missingFields.length > 0) {
        return res
            .status(400)
            .json(new ApiError(400, `Missing required fields: ${missingFields.join(", ")}`));
    }

    const isDuplicate = await Currency.findOne({
        $or: [{ currencyName }, { currencyCode }]
    });

    if (isDuplicate) {
        return res
            .status(400)
            .json(new ApiError(400, "Currency already exists"));
    }

    const newCurrency = await Currency.create({
        currencyName,
        currencyCode,
        currencySymbol,
        status,
        country
    });

    return res
        .status(201)
        .json(new ApiResponse(201, newCurrency, "Currency created successfully"));
});


// Update Currency
const updateCurrency = asyncHandler(async (req, res) => {
    console.log("update currency", req.body);

    const { id } = req.params;
    const { currencyName, currencyCode, currencySymbol, status, country } = req.body;

    const requiredFields = { currencyName, currencyCode, currencySymbol, country };
    const missingFields = Object.keys(requiredFields).filter(
        (field) => !requiredFields[field] || requiredFields[field] === "undefined"
    );

    if (missingFields.length > 0) {
        return res
            .status(400)
            .json(new ApiError(400, `Missing required fields: ${missingFields.join(", ")}`));
    }

    const currency = await Currency.findById(id);
    if (!currency) {
        return res
            .status(404)
            .json(new ApiError(404, "Currency not found"));
    }

    const updatedCurrency = await Currency.findByIdAndUpdate(
        id,
        { currencyName, currencyCode, currencySymbol, status, country },
        { new: true }
    );

    return res
        .status(200)
        .json(new ApiResponse(200, updatedCurrency, "Currency updated successfully"));
});


//get currency by id
const getCurrencyById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json(new ApiError(400, 'Currency ID is required'));

    const currency = await Currency.findById(id);
    if (!currency) return res.status(404).json(new ApiError(404, 'Currency not found'));

    res.status(200).json(new ApiResponse(200, currency, 'Currency fetched successfully'));
});


//get all currencies
const getAllCurrency = asyncHandler(async (req, res) => {
    const currencies = await Currency.find({}).populate('country', 'name currencyCode symbol symbolNative flag');
    res.status(200).json(new ApiResponse(200, currencies, 'Currencies fetched successfully'));
});


//delete currency
const deleteCurrency = asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json(new ApiError(400, 'Currency ID is required'));

    const currency = await Currency.findById(id);
    if (!currency) return res.status(404).json(new ApiError(404, 'Currency not found'));

    await Currency.findByIdAndDelete(id);
    res.status(200).json(new ApiResponse(200, 'Currency deleted successfully'));
});


//upsert exchange rates
const createOrUpdateExchange = asyncHandler(async (req, res) => {
    const { baseCurrencyCode, exchangeRateDetails, countryId } = req.body;

    const baseCurrency = await Currency.findOne({ currencyCode: baseCurrencyCode });
    if (!baseCurrency) {
        return res.status(404).json(new ApiError(404, 'Base currency not found'));
    }

    const details = [];

    for (const rate of exchangeRateDetails) {
        const target = await Currency.findOne({ currencyCode: rate.currencyCode });
        if (!target) {
            return res.status(400).json(new ApiError(400, `Target currency ${rate.currencyCode} not found`));
        }
        details.push({ exchangeCurrencyId: target._id, exchangeRate: rate.exchangeRate });
    }

    const countryExists = await Country.findById(countryId);
    if (!countryExists) {
        return res.status(404).json(new ApiError(404, 'Country not found'));
    }

    const updated = await Exchange.findOneAndUpdate(
        { baseCurrencyId: baseCurrency._id, country: countryId },
        {
            baseCurrencyId: baseCurrency._id,
            country: countryId,
            exchangeRateDetails: details
        },
        { new: true, upsert: true }
    );

    res.status(200).json(new ApiResponse(200, updated, 'Exchange rates updated successfully'));
});


//get all exchange rates
const getAllExchanges = asyncHandler(async (req, res) => {
    const exchanges = await Exchange.find({})
        .populate('country', 'name')
        .populate('baseCurrencyId', 'currencyName currencyCode currencySymbol')
        .populate('exchangeRateDetails.exchangeCurrencyId', 'currencyName currencyCode currencySymbol');

    res.status(200).json(new ApiResponse(200, exchanges, 'All exchange rates fetched successfully'));
});


//get exhange rate by id
const getExchangeById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const exchange = await Exchange.findById(id)
        .populate('baseCurrencyId', 'currencyName currencyCode currencySymbol')
        .populate('exchangeRateDetails.exchangeCurrencyId', 'currencyName currencyCode currencySymbol');

    if (!exchange) {
        return res.status(404).json(new ApiError(404, 'Exchange not found'));
    }

    res.status(200).json(new ApiResponse(200, exchange, 'Exchange fetched successfully'));
});


//delete exchange rate by id
const deleteExchange = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const deleted = await Exchange.findByIdAndDelete(id);

    if (!deleted) {
        return res.status(404).json(new ApiError(404, 'Exchange not found'));
    }

    res.status(200).json(new ApiResponse(200, deleted, 'Exchange deleted successfully'));
});


export {
    createCurrency,
    updateCurrency,
    getCurrencyById,
    getAllCurrency,
    deleteCurrency,
    createOrUpdateExchange,
    getAllExchanges,
    getExchangeById,
    deleteExchange
};
