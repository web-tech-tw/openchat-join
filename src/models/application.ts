import mongoose, {Schema, Document, Model, Types} from "mongoose";

export interface IPGeolocation {
    range?: number[];
    country?: string;
    region?: string;
    city?: string;
    ll?: number[];
    metro?: number;
    area?: number;
    eu?: string;
    timezone?: string;
}

const IPGeolocationSchema = new Schema({
    range: {
        type: [Number],
        required: false,
    },
    country: {
        type: String,
        required: false,
    },
    region: {
        type: String,
        required: false,
    },
    city: {
        type: String,
        required: false,
    },
    ll: {
        type: [Number],
        required: false,
    },
    metro: {
        type: Number,
        required: false,
    },
    area: {
        type: Number,
        required: false,
    },
    eu: {
        type: String,
        required: false,
    },
    timezone: {
        type: String,
        required: false,
    },
}, {
    _id: false,
});

export interface IApplication extends Document {
    code: string;
    zebraCode: string;
    roomSlug: string;
    userAgent: string;
    ipAddress: string;
    ipGeolocation: IPGeolocation;
    commitBy?: Types.ObjectId;
    commitAt?: Date;
    commitState?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const ApplicationSchema = new Schema<IApplication>({
    code: {
        type: String,
        required: true,
        unique: true,
    },
    zebraCode: {
        type: String,
        required: true,
    },
    roomSlug: {
        type: String,
        required: true,
    },
    userAgent: {
        type: String,
        required: true,
    },
    ipAddress: {
        type: String,
        required: true,
    },
    ipGeolocation: {
        type: IPGeolocationSchema,
        required: true,
    },
    commitBy: {
        type: Schema.Types.ObjectId,
        required: false,
    },
    commitAt: {
        type: Date,
        required: false,
    },
    commitState: {
        type: Boolean,
        required: false,
    },
}, {
    timestamps: true,
});

export const Application: Model<IApplication> =
    mongoose.models.Application ||
    mongoose.model<IApplication>("Application", ApplicationSchema);
export default Application;
