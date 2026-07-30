import { Router, type Request, type Response,} from "express";
import { getRoleByUser, isAdmin,} from "../../middlewares/auth.middleware";
const adminRouter = Router();
adminRouter.use(getRoleByUser);
adminRouter.use(isAdmin);
adminRouter.get("/check",(request: Request, response: Response) => {
    return response.status(200).json({
      success: true,
      code: "admin_access_granted",
      message: "Administrator access granted",
      data: {
        id: request.authUser?.id,
        email: request.authUser?.email,
        role: request.authUser?.role,
      },
    });
  },
);

adminRouter.get("/profile",(request: Request, response: Response) => {
    const authUser = request.authUser;
    if (!authUser) {
      return response.status(401).json({
        success: false,
        code: "authentication_required",
        message: "Authentication is required",
      });
    }
    return response.status(200).json({
      success: true,
      code: "admin_profile_success",
      data: {
        id: authUser.id,
        email: authUser.email,
        role: authUser.role,
      },
    });
  },
);
export default adminRouter;