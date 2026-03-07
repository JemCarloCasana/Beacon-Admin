import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Auth from "@/pages/Auth";
import { adminLogin } from "@/api/adminAuth";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/api/adminAuth", () => ({
  adminLogin: vi.fn(),
}));

function renderAuth() {
  return render(
    <MemoryRouter>
      <Auth />
    </MemoryRouter>
  );
}

describe("Auth page validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("shows contact administrator message", () => {
    renderAuth();
    expect(screen.getByText("Contact your administrator for access.")).toBeInTheDocument();
  });

  it("shows inline login email error and blocks submit", async () => {
    renderAuth();

    const email = screen.getByPlaceholderText("name@dagupan.gov");
    const password = screen.getByPlaceholderText("********");
    fireEvent.change(email, { target: { value: "bad-email" } });
    fireEvent.change(password, { target: { value: "SomePassword1!" } });
    fireEvent.blur(email);

    expect(await screen.findByText("Please enter a valid email address.")).toBeInTheDocument();
    expect(adminLogin).not.toHaveBeenCalled();
  });

  it("clears inline error when login email becomes valid", async () => {
    renderAuth();

    const email = screen.getByPlaceholderText("name@dagupan.gov");
    fireEvent.blur(email);
    expect(await screen.findByText("Email is required.")).toBeInTheDocument();

    fireEvent.change(email, { target: { value: "valid@example.com" } });

    await waitFor(() => {
      expect(screen.queryByText("Email is required.")).not.toBeInTheDocument();
    });
  });

  it("submits login with normalized email", async () => {
    adminLogin.mockResolvedValue({ token: "token123" });
    renderAuth();

    fireEvent.change(screen.getByPlaceholderText("name@dagupan.gov"), {
      target: { value: "  ADMIN@Example.COM " },
    });
    fireEvent.change(screen.getByPlaceholderText("********"), {
      target: { value: "AnyPassword1!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Access Dashboard/i }));

    await waitFor(() => {
      expect(adminLogin).toHaveBeenCalledWith({
        email: "admin@example.com",
        password: "AnyPassword1!",
      });
    });
    expect(localStorage.getItem("admin_token")).toBe("token123");
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
  });
});
