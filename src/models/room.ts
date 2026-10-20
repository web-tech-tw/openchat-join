import mongoose, {Schema, Document, Model} from "mongoose";

export interface IRoom extends Document {
    label: string;
    slug: string;
}

const RoomSchema = new Schema<IRoom>({
    label: {
        type: String,
        required: true,
        unique: true,
    },
    slug: {
        type: String,
        required: true,
        unique: true,
    },
});

export const Room: Model<IRoom> = mongoose.models.Room ||
    mongoose.model<IRoom>("Room", RoomSchema);
export default Room;
