import DatePicker from "react-datepicker";
import React, { forwardRef } from "react";

type CustomInputProps = React.InputHTMLAttributes<HTMLInputElement>;

const CustomInput = forwardRef<HTMLInputElement, CustomInputProps>(
	(props, ref) => <input inputMode={"none"} {...props} ref={ref} />,
);
CustomInput.displayName = "CustomInput";

export default function CustomDatePicker({
	className,
	dateFormat,
	popperProps,
	todayButton,
	...props
}: React.ComponentProps<typeof DatePicker>) {
	return (
		<DatePicker
			dateFormat={dateFormat ?? "yyyy-MM-dd"}
			className={`tare-input tare-date-input ${className || ""}`}
			popperProps={popperProps ?? { strategy: "fixed" }}
			todayButton={todayButton ?? "Today"}
			customInput={<CustomInput />}
			{...props}
		/>
	);
}
